const debug = false

const logger = {
	info: (...message: unknown[]) => console.log("[TSDaemon]", ...message),
	debug: (...message: unknown[]) => debug && console.debug("[TSDaemon]", ...message),
	error: (...message: unknown[]) => console.error("[TSDaemon]", ...message),
}
export default logger
