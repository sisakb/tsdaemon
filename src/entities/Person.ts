import { PersonEntityName, ZoneEntityName } from "../HassTypes.js"
import { Entity } from "./Entity.js"
import { Zone } from "./Zone.js"

export type PersonState = ZoneEntityName | "not_home" | "home" | "unknown"
export type PersonAttributes = {
	editable: boolean
	id: string
	latitude: number
	longitude: number
	gps_accuracy: number
	source: string
	user_id: string
	device_trackers: string[]
	friendly_name: string
}
export type PersonEvent = "arrivedHome" | "leftHome"

export class Person extends Entity<PersonEntityName, PersonState, PersonAttributes, PersonEvent> {
	private arriveListeners: Map<string, Set<() => void>> = new Map()
	private leaveListeners: Map<string, Set<() => void>> = new Map()

	public get isHome() {
		return this.state === "home"
	}

	public get isAway() {
		return this.state !== "home"
	}

	public onArrive(zone: ZoneEntityName | Zone, callback: () => void) {
		const zoneObj = zone instanceof Zone ? zone : new Zone(zone)
		const zoneFriendlyName = zoneObj.attributes.friendly_name
		if (!this.arriveListeners.has(zoneFriendlyName)) this.arriveListeners.set(zoneFriendlyName, new Set())
		this.arriveListeners.get(zoneFriendlyName)!.add(callback)
	}

	public onLeave(zone: ZoneEntityName | Zone, callback: () => void) {
		const zoneObj = zone instanceof Zone ? zone : new Zone(zone)
		const zoneFriendlyName = zoneObj.attributes.friendly_name
		if (!this.leaveListeners.has(zoneFriendlyName)) this.leaveListeners.set(zoneFriendlyName, new Set())
		this.leaveListeners.get(zoneFriendlyName)!.add(callback)
	}

	protected override onStateChange(oldState: PersonState, oldAttributes: PersonAttributes): void {
		if (oldState === "unknown") return
		if (oldState !== this._state) {
			if (this._state === "home") this.fire("arrivedHome")
			else if (this._state !== "home" && oldState === "home") this.fire("leftHome")

			this.arriveListeners.get(this._state)?.forEach((listener) => listener())
			this.leaveListeners.get(oldState)?.forEach((listener) => listener())
		}
	}
}
