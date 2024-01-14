import { PersonEntityName, ZoneEntityName } from "../HassTypes.js"
import { Entity } from "./Entity.js"
import { Person } from "./Person.js"

export type ZoneState = string
export type ZoneAttributes = {
	latitude: number
	longitude: number
	radius: number
	passive: boolean
	persons: string[]
	editable: boolean
	icon: string
	friendly_name: string
}
export type ZoneEvent = never

export class Zone extends Entity<ZoneEntityName, ZoneState, ZoneAttributes, ZoneEvent> {
	public get numberOfPeople() {
		return Number(this.state || 0)
	}
	public get people() {
		return this._attributes.persons.map((person) => new Person(person as PersonEntityName))
	}
	protected override onStateChange(oldState: ZoneState, oldAttributes: ZoneAttributes): void {}
}
