import { MediaPlayerEntityName } from "../HassTypes.js"
import { Entity } from "./Entity.js"

export type MediaPlayerState = "paused" | "playing" | "buffering" | "unavailable"
export type MediaPlayerAttributes = {
	group_members?: string[]
	volume_level: number
	is_volume_muted: boolean
	media_content_id: string
	media_content_type: "music"
	media_duration: number
	media_position: number
	media_position_updated_at: string
	media_title: string
	media_artist: string
	media_album_name: string
	shuffle: boolean
	repeat: "off"
	queue_position: number
	queue_size: number
	device_class: "speaker"
	entity_picture: string
	friendly_name: string
	supported_features: number
}
export type MediaPlayerEvent = "play" | "pause" | "songChange" | "volumeChange" | "seek"

export class MediaPlayer extends Entity<
	MediaPlayerEntityName,
	MediaPlayerState,
	MediaPlayerAttributes,
	MediaPlayerEvent
> {
	public pause() {
		this.callService("media_player", "media_pause")
	}

	public play() {
		this.callService("media_player", "media_play")
	}

	public stop() {
		this.callService("media_player", "media_stop")
	}

	public nextTrack() {
		this.callService("media_player", "media_next_track")
	}

	public previousTrack() {
		this.callService("media_player", "media_previous_track")
	}

	public setVolume(volume: number) {
		this.callService("media_player", "volume_set", { volume_level: volume })
	}

	public mute() {
		this.callService("media_player", "volume_mute", { is_volume_muted: true })
	}

	public unmute() {
		this.callService("media_player", "volume_mute", { is_volume_muted: false })
	}

	public setShuffle(shuffle: boolean) {
		this.callService("media_player", "shuffle_set", { shuffle })
	}

	public seek(position: number) {
		this.callService("media_player", "media_seek", { seek_position: position })
	}

	private lastPlaybackState: "playing" | "paused" | "idle" = "idle"
	protected override onStateChange(oldState: MediaPlayerState, oldAttributes: MediaPlayerAttributes): void {
		if (oldState === "unavailable") return

		if (oldState !== this._state && (this._state === "playing" || this._state === "paused")) {
			if (this._state === "playing" && this.lastPlaybackState !== "playing") {
				this.fire("play")
			}
			if (this._state === "paused" && this.lastPlaybackState !== "paused") {
				this.fire("pause")
			}
			this.lastPlaybackState = this._state
		}

		if (
			oldAttributes.media_title !== this._attributes.media_title &&
			oldAttributes.media_artist !== this._attributes.media_artist
		) {
			this.fire("songChange")
		}

		if (oldAttributes.volume_level !== this._attributes.volume_level) {
			this.fire("volumeChange")
		}

		if (oldAttributes.media_position !== this._attributes.media_position) {
			this.fire("seek")
		}

		//console.log("state changed", this._state, this.attributes)
	}
}
