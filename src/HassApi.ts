import WebSocket from "ws"
import logger from "./utils/logger.js"

interface InitializeOptions {
	url: string
	secure?: boolean
	token: string
}

export interface HassEvent {
	event_type: string
	data: any
	origin: string
	time_fired: string
}

type InternalEventType =
	| "auth_required"
	| "auth"
	| "auth_ok"
	| "get_states"
	| "result"
	| "subscribe_events"
	| "event"
	| "call_service"
	| "connected"
type EventType = "connected"
type EventListenerCallback = (data: any, event?: HassEvent) => void
type EventListener = { callback: EventListenerCallback; type: EventType; once?: boolean; id?: number }
type InternalEventListener = {
	callback: EventListenerCallback
	type: InternalEventType
	once?: boolean
	id?: number | null
}
export interface EntityState {
	entity_id: string
	state: string
	attributes: { [key: string]: any }
	last_changed: string
	last_updated: string
}

class HassApi {
	private static instance: HassApi

	private ws: WebSocket
	private internalListeners: Map<InternalEventType, InternalEventListener[]> = new Map()
	private listeners: Map<EventType, EventListener[]> = new Map()
	private stateChangeListeners: Map<string, EventListenerCallback[]> = new Map()
	private states: Map<string, EntityState> = new Map()

	public readonly url: string
	public readonly token: string
	private authed = false
	private id = 1

	private constructor({ url, token, secure = true }: InitializeOptions) {
		this.url = url
		this.token = token

		this.addInternalListener("auth_required", this.onAuthRequired.bind(this))
		this.addInternalListener("auth_ok", this.onAuthOk.bind(this))

		const protocol = secure ? "wss" : "ws"
		this.ws = new WebSocket(`${protocol}://${url}/api/websocket`)
		this.ws.onmessage = this.onWsMessage.bind(this)
		this.ws.onopen = this.onWsOpen.bind(this)
		this.ws.onclose = this.onWsClose.bind(this)
		this.ws.onerror = this.onWsError.bind(this)
	}

	public static initialize(options: InitializeOptions): Promise<HassApi> {
		return new Promise((resolve, reject) => {
			this.instance = new HassApi(options)
			this.instance.addInternalListener(
				"connected",
				() => {
					logger.debug("Connected to Home Assistant")
					resolve(this.instance)
				},
				{ once: true },
			)
		})
	}

	public static getInstance(): HassApi {
		return this.instance
	}

	private addInternalListener(
		type: InternalEventType,
		callback: EventListenerCallback,
		{ once = false, id = null }: { once?: boolean; id?: number | null } = {},
	) {
		if (!this.internalListeners.has(type)) this.internalListeners.set(type, [])
		this.internalListeners.get(type)?.push({ type, callback, once, id })
	}

	private onWsMessage(event: WebSocket.MessageEvent) {
		const message = JSON.parse(event.data.toString())

		this.internalListeners.get(message.type)?.forEach((listener) => {
			if (!message.id || message.id === listener.id) listener.callback(message)
		})
	}

	private onWsOpen() {
		logger.debug("WebSocket connection opened")
	}

	// WebSocket connection is closed
	private onWsClose() {
		logger.debug("WebSocket connection closed")
	}

	// WebSocket connection error
	private onWsError(error: WebSocket.ErrorEvent) {
		logger.debug(error)
		logger.error("WebSocket connection error")
	}

	private async onAuthRequired() {
		logger.debug("Authentication required")
		this.sendMessage("auth", { access_token: this.token })
	}

	private async onAuthOk() {
		logger.debug("Authentication successful")
		this.authed = true

		const _states = await this.getStates()
		this.states = new Map(_states.map((state) => [state.entity_id, state]))
		logger.debug("Fetched all states")
		this.subscribeToEvents()

		this.callListeners("connected")
		this.callInternalListeners("connected")
	}

	private subscribeToEvents() {
		logger.debug("Subscribing to events")
		const id = this.sendMessage("subscribe_events")
		this.addInternalListener("event", (data) => this.onEvent(data.event), { id })
	}

	private callInternalListeners(type: InternalEventType) {
		this.internalListeners.get(type)?.forEach((listener) => {
			listener.callback(null)
		})
	}

	private sendMessage(type: InternalEventType, data = {}, onResult?: (data: any) => void): number | null {
		const message: { type: InternalEventType; id?: number } = { type, ...data }
		if (this.authed) {
			message.id = this.id++
			if (onResult) this.addInternalListener("result", (e) => onResult(e.result), { once: true, id: message.id })
		}
		this.ws.send(JSON.stringify(message))

		return message.id || null
	}

	private callListeners(type: EventType, data: any = {}) {
		this.listeners.get(type)?.forEach((listener) => {
			listener.callback(data)
		})
	}

	private async getStates() {
		return new Promise<EntityState[]>((resolve, reject) => {
			this.sendMessage("get_states", {}, (data) => {
				resolve(data)
			})
		})
	}

	public on(type: EventType, callback: EventListenerCallback) {
		this.addListener(type, { type, callback })
	}

	public onStateChange(entity_id: string, callback: EventListenerCallback) {
		if (!this.stateChangeListeners.has(entity_id)) this.stateChangeListeners.set(entity_id, [])
		this.stateChangeListeners.get(entity_id)?.push(callback)
	}

	public getState(entityId: string) {
		return this.states.get(entityId)
	}

	public callService(domain: string, service: string, service_data?: any, entity_id?: string) {
		this.sendMessage("call_service", { domain, service, service_data, target: { entity_id } })
	}

	private onEvent(event: HassEvent) {
		if (event.event_type === "state_changed") this.onStateChangeEvent(event)
		//else log("Received unhandled event:", event.event_type)
	}

	private onStateChangeEvent(event: HassEvent) {
		this.stateChangeListeners.get(event.data.entity_id)?.forEach((listener) => {
			listener(event.data.new_state, event)
		})
	}

	private addListener(type: EventType, listener: EventListener) {
		if (!this.listeners.has(type)) this.listeners.set(type, [])
		this.listeners.get(type)?.push(listener)
	}

	public getEntities() {
		return [...this.states.keys()]
	}

	public async restGet(path: string) {
		return new Promise((resolve, reject) => {
			const protocol = this.url.startsWith("localhost") ? "http" : "https"
			const url = `${protocol}://${this.url}/api${path.startsWith("/") ? path : "/" + path}`
			const headers = { Authorization: `Bearer ${this.token}` }
			fetch(url, { headers })
				.then((response) => response.json())
				.then((data) => resolve(data))
				.catch((error) => reject(error))
		})
	}

	public async getHistory({
		entityId,
		startTime,
		endTime,
		minimalResponse,
		noAttributes,
		significantChangesOnly,
	}: {
		entityId: string
		startTime?: Date
		endTime?: Date
		minimalResponse?: boolean
		noAttributes?: boolean
		significantChangesOnly?: boolean
	}) {
		const requestUrl = new URL(
			`/history/period${startTime ? "/" + startTime?.toISOString() : ""}`,
			`https://${this.url}`,
		)
		requestUrl.searchParams.append("filter_entity_id", entityId)
		if (endTime) requestUrl.searchParams.append("end_time", endTime.toISOString())
		if (minimalResponse) requestUrl.searchParams.append("minimal_response", "true")
		if (noAttributes) requestUrl.searchParams.append("no_attributes", "true")
		if (significantChangesOnly) requestUrl.searchParams.append("significant_changes_only", "true")
		const response = await HassApi.getInstance().restGet(requestUrl.pathname + requestUrl.search)
		return response as {
			entity_id: string
			state: string
			attributes: { [key: string]: any }
			last_changed: string
			last_updated: string
		}[][]
	}

	public close() {
		this.ws.close()
	}
}

export default HassApi
