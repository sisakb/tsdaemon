export { default as HassApi } from "./HassApi.js"
export { Entity } from "./entities/Entity.js"
export { Light } from "./entities/Light.js"
export { MotionSensor } from "./entities/MotionSensor.js"
export { BinarySensor } from "./entities/BinarySensor.js"
export { Zone } from "./entities/Zone.js"
export { Person } from "./entities/Person.js"
export { DeviceTracker } from "./entities/DeviceTracker.js"
export { Climate } from "./entities/Climate.js"
export { MediaPlayer } from "./entities/MediaPlayer.js"

import nodemon from "nodemon"
import path from "node:path"
import logger from "./utils/logger.js"
import { createTypes, initializeHassApi } from "./initializer.js"
import HassApi from "./HassApi.js"

const command = process.argv[2]

if (command === "start") {
	const cwd = process.argv[3] || process.cwd()
	logger.info("Wrapper started. Watching for changes...")

	nodemon({
		script: path.join(cwd, "node_modules", "tsdaemon", "dist", "app.js"),
		watch: [cwd],
		ext: "ts",
		cwd,
		nodeArgs: ["--inspect"],
	})

	nodemon
		.on("start", function () {})
		.on("quit", function () {
			logger.info("App has quit unexpectedly. Stopping the wrapper.")
			process.exitCode = 1
		})
		.on("restart", function (files) {
			logger.info("Detected changes in", files?.join(", "))
		})
		.on("crash", function () {
			logger.info("App has crashed.")
		})
} else if (command === "generate") {
	initializeHassApi().then(async () => {
		await createTypes()
		HassApi.getInstance().close()
	})
}
