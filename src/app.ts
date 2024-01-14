import { compileAutomations, createTypes, initializeHassApi, startAutomations } from "./initializer.js"

const main = async () => {
	await initializeHassApi()
	createTypes()
	const automations = compileAutomations()
	startAutomations(automations)
}

main()
