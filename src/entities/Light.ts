import { LightEntityName } from "../HassTypes.js"
import { Entity, HassServices } from "./Entity.js"

export type LightState = "on" | "off" | "unavailable"
export type LightAttributes = {
	brightness: number
	color_temp: number
}
export type LightEvent = "toggle" | "on" | "off" | "brightness"

export class Light extends Entity<LightEntityName, LightState, LightAttributes, LightEvent> {
	public get isOn() {
		return this._state === "on"
	}

	public toggle() {
		this.callService("light", "toggle")
	}

	public turnOn(options: Partial<HassServices["light"]["turn_on"]> = {}) {
		this.callService("light", "turn_on", options)
	}

	public turnOff() {
		this.callService("light", "turn_off")
	}

	public setBrightness(brightness: number, transition = 1) {
		this.callService("light", "turn_on", { brightness_pct: brightness * 100, transition })
	}

	public setColorTemperature(colorTemperatureKelvin: number) {
		this.callService("light", "turn_on", { kelvin: colorTemperatureKelvin })
	}

	public playEffect(effect: HassServices["light"]["turn_on"]["effect"]) {
		this.callService("light", "turn_on", { effect })
	}

	protected override onStateChange(oldState: LightState, oldAttributes: LightAttributes): void {
		if (oldState === "unavailable") return
		if (oldState !== this._state) {
			this.fire("toggle")
			if (this._state === "on") this.fire("on")
			else if (this._state === "off") this.fire("off")
		} else if (oldAttributes.brightness !== this._attributes.brightness) {
			this.fire("brightness")
		}
	}
}
