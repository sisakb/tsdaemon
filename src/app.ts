import { compileAutomations, createTypes, initializeHassApi, startAutomations } from "./initializer.js"

const main = async () => {
	await initializeHassApi()
	await createTypes()
	const automations = await compileAutomations()
	await startAutomations(automations)
}

main()
