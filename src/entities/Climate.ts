import { ClimateEntityName } from "../HassTypes.js"
import { Entity, HassServices } from "./Entity.js"

export type ClimateState = string
export type ClimateAttributes = {
	hvac_modes: string[]
	min_temp: number
	max_temp: number
	target_temp_step: number
	current_temperature: number
	temperature: number
	away_mode: string
	battery: number
	child_lock: string
	current_heating_setpoint: number
	local_temperture: number
	position: number | null
	preset: string
}
export type ClimateEvent = never

export class Climate extends Entity<ClimateEntityName, ClimateState, ClimateAttributes, ClimateEvent> {
	get currentTemperature() {
		return this.attributes.current_temperature ?? null
	}

	get targetTemperature() {
		return this.attributes.current_heating_setpoint ?? this.attributes.temperature ?? null
	}

	setTargetTemperature(temperature: number) {
		this.callService("climate", "set_temperature", { temperature })
	}

	protected override onStateChange(oldState: ClimateState, oldAttributes: ClimateAttributes): void {}
}
