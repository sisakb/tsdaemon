import dotenv from "dotenv"
import * as prettier from "prettier"
import path from "node:path"
import fs from "node:fs"
import ts from "typescript"
import logger from "./utils/logger.js"
import HassApi from "./HassApi.js"

dotenv.config({
	path: process.cwd() + "/.env",
})

const tsdaemonPath = path.join(process.cwd(), "node_modules", "tsdaemon", "dist")

const token = process.env.HASS_TOKEN
const url = process.env.HASS_URL
if (!token || !url) {
	throw new Error("HASS_TOKEN or HASS_URL not found in environment variables.")
}

export const createTypes = async () => {
	logger.info("Fetching entities from Home Assistant...")

	try {
		const entities = HassApi.getInstance().getEntities()

		const lights = entities.filter((entity) => entity.startsWith("light."))
		const binarySensors = entities.filter((entity) => entity.startsWith("binary_sensor."))
		const zones = entities.filter((entity) => entity.startsWith("zone."))
		const persons = entities.filter((entity) => entity.startsWith("person."))
		const devices = entities.filter((entity) => entity.startsWith("device_tracker."))
		const climates = entities.filter((entity) => entity.startsWith("climate."))
		const mediaPlayers = entities.filter((entity) => entity.startsWith("media_player."))

		let output = ""

		if (!entities?.length) {
			logger.info("No entities found.")
			output += "export type LightEntityName = string\n"
			output += "export type BinarySensorEntityName = string\n"
			output += "export type ZoneEntityName = string\n"
			output += "export type PersonEntityName = string\n"
			output += "export type DeviceTrackerEntityName = string\n"
			output += "export type ClimateEntityName = string\n"
			output += "export type MediaPlayerEntityName = string\n"
			output += "\n"
			output += "export type EntityName = string\n"
		} else {
			output += "export type LightEntityName = '" + lights.join("' | '") + "'\n"
			output += "export type BinarySensorEntityName = '" + binarySensors.join("' | '") + "'\n"
			output += "export type ZoneEntityName = '" + zones.join("' | '") + "'\n"
			output += "export type PersonEntityName = '" + persons.join("' | '") + "'\n"
			output += "export type DeviceTrackerEntityName = '" + devices.join("' | '") + "'\n"
			output += "export type ClimateEntityName = '" + climates.join("' | '") + "'\n"
			output += "export type MediaPlayerEntityName = '" + mediaPlayers.join("' | '") + "'\n"
			output += "\n"
			output += "export type EntityName = '" + entities.join("' | '") + "'\n"
		}
		output = await prettier.format(output, { parser: "typescript", semi: false, tabWidth: 4, useTabs: true })
		fs.writeFileSync(path.join(tsdaemonPath, "HassTypes.d.ts"), output)
		logger.info("Types generated.")
	} catch (e) {
		logger.error(e)
		logger.error("Failed to generate types.")
	}
}

export const getAutomationFilePaths = (root = process.cwd()) => {
	const files = fs.readdirSync(root)
	const filePaths: string[] = []
	for (const file of files) {
		const filePath = path.join(root, file)
		try {
			const stat = fs.statSync(filePath)
			if (stat.isDirectory() && file !== "node_modules") {
				filePaths.push(...getAutomationFilePaths(filePath))
			} else if (file.endsWith(".ts") && !file.endsWith(".d.ts")) {
				filePaths.push(filePath)
			}
		} catch (e) {
			// ignore
		}
	}
	return filePaths
}

export const compileAutomations = async () => {
	const tsFiles = getAutomationFilePaths()
	logger.info("Found automation files:", tsFiles.map((p) => path.relative(process.cwd(), p)).join(", "))
	const program = ts.createProgram(tsFiles, {
		outDir: path.join("dist"),
		moduleResolution: ts.ModuleResolutionKind.Node16,
		module: ts.ModuleKind.Node16,
		strict: true,
		resolveJsonModule: true,
		sourceMap: true,
		target: ts.ScriptTarget.ES2022,
		esModuleInterop: true,
		skipLibCheck: true,
		allowSyntheticDefaultImports: true,
		rootDir: process.cwd(),
	})
	const emitResult = program.emit()
	const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics)
	allDiagnostics.forEach((diagnostic) => {
		if (diagnostic.file) {
			const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!)
			const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
			logger.info(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`)
		} else {
			logger.info(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
		}
	})
	const success = allDiagnostics.every((diagnostic) => diagnostic.category !== ts.DiagnosticCategory.Error)
	if (success) {
		logger.info(`Compilation finished for ${tsFiles.length} files.`)
	} else {
		logger.info(`Compilation failed.`)
		process.exit(1)
	}
	return tsFiles
}

export const startAutomations = async (filePaths: string[]) => {
	for (const filePath of filePaths) {
		const importUrl =
			"file://" + path.join(process.cwd(), "dist", path.relative(process.cwd(), filePath).replace(".ts", ".js"))
		import(importUrl)
	}
	logger.info("All files imported.")
}

export const initializeHassApi = async () => {
	await HassApi.initialize({
		url,
		token,
	})
}
