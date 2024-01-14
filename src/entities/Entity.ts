import HassApi, { type EntityState, type HassEvent } from "../HassApi.js"
import { DeviceTrackerEntityName } from "../HassTypes.js"

export type EntityAttributes = { [key: string]: any }
type EntityEventListener = () => void

export type HassServices = {
	light: {
		turn_on: {
			transition: number
			rgb_color: [number, number, number]
			rgbw_color: [number, number, number, number]
			rgbww_color: [number, number, number, number, number]
			color_name: string
			hs_color: [number, number]
			xy_color: [number, number]
			color_temp: number
			kelvin: number
			brightness: number
			brightness_pct: number
			brighness_step: number
			brightness_step_pct: number
			white: number
			profile: string
			flash: string
			effect: "blink" | "breathe" | "okay" | "channel_change" | "finish_effect" | "stop_effect"
		}
		turn_off: {}
		toggle: {}
	}
	notify: {
		[key: string]: {
			message: string
			title: string
			target: string
			data: { [key: string]: any }
		}
	}
	climate: {
		turn_on: {}
		turn_off: {}
		set_temperature: {
			temperature: string | number
			target_temp_high: string
			target_temp_low: string
			hvac_mode: string
		}
		set_swing_mode: {
			swing_mode: string
		}
		set_preset_mode: {
			prest_mode: string
		}
		set_hvac_mode: {
			hvac_mode: string
		}
		set_humidity: {
			humidity: string
		}
		set_fan_mode: {
			fan_mode: string
		}
		set_aux_heat: {
			aux_heat: string
		}
	}
}

export class Entity<
	EntityId extends string,
	TState extends string = never,
	TAttributes extends EntityAttributes = never,
	TEventType extends string = never
> {
	protected _state: TState
	protected _attributes: TAttributes
	private _lastChanged: Date | null = null
	private _lastUpdated: Date | null = null

	private listeners: Map<TEventType | "stateChange", EntityEventListener[]> = new Map()

	public constructor(public readonly entityId: EntityId) {
		const fullState = HassApi.getInstance().getState(entityId)
		if (!fullState) throw new Error(`Entity ${entityId} not found`)
		this._state = fullState.state as TState
		this._attributes = fullState.attributes as TAttributes
		this._lastChanged = new Date(fullState.last_changed)
		this._lastUpdated = new Date(fullState.last_updated)

		HassApi.getInstance().onStateChange(entityId, this.onFullStateChange.bind(this))
	}

	private onFullStateChange(state: EntityState, event?: HassEvent) {
		if (!event) return
		const {
			state: newState,
			attributes: newAttributes,
			last_changed: newLastChanged,
			last_updated: newLastUpdated,
		} = state

		this._state = newState as TState
		this._attributes = newAttributes as TAttributes
		this._lastChanged = new Date(newLastChanged)
		this._lastUpdated = new Date(newLastUpdated)

		this.onStateChange(event.data.old_state?.state as TState, event.data.old_state?.attributes as TAttributes)
	}

	protected callService<TDomain extends keyof HassServices, TService extends keyof HassServices[TDomain]>(
		domain: TDomain,
		service: TService,
		service_data?: Partial<HassServices[TDomain][TService]>
	) {
		HassApi.getInstance().callService(domain, service as string, service_data, this.entityId)
	}

	protected onStateChange(oldState: TState, oldAttributes: TAttributes) {
		// Override this method to handle state changes and call the appropriate listeners
	}

	protected fire(event: TEventType) {
		this?.listeners.get(event)?.forEach((listener) => listener())
	}

	public on(event: TEventType | "stateChange", listener: () => void) {
		if (!this.listeners.has(event)) this.listeners.set(event, [] as EntityEventListener[])
		this.listeners.get(event)?.push(listener)
	}

	get lastChanged(): Date | null {
		return this._lastChanged
	}

	get lastUpdated(): Date | null {
		return this._lastUpdated
	}

	public get state() {
		return this._state
	}

	public get attributes() {
		return this._attributes
	}

	public async getHistory(startTime?: Date, endTime?: Date) {
		const response = await HassApi.getInstance().getHistory({
			entityId: this.entityId,
			startTime,
			endTime,
		})
		return response[0]
	}

	public async stateAt(time: Date) {
		const history = await HassApi.getInstance().getHistory({
			entityId: this.entityId,
			startTime: time,
			endTime: time,
			minimalResponse: true,
			noAttributes: true,
		})
		return history?.at(0)?.at(0)?.state as TState
	}
}
