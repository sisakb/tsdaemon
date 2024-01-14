import HassApi from "../HassApi.js"
import { DeviceTrackerEntityName } from "../HassTypes.js"
import { Entity } from "./Entity.js"
import { Person, PersonState } from "./Person.js"

export type DeviceTrackerState = PersonState
export type DeviceTrackerAttributes = {
	latitude: number
	longitude: number
	source_type: string
	gps_accuracy: number
	altitude: number
	course: number
	speed: number
	vertical_accuracy: number
	friendly_name: string
}
export type DeviceTrackerEvent = never

interface CommonNotificationData {
	/** Combine notifications together visually by using the same group. */
	group: string
	/** Tag that is used to replace existing notifications. Call with "clear_notification" as message to clear existing notifications. */
	tag: string
}

interface AndroidNotificationData extends CommonNotificationData {
	/** URL to open when clicking on the notification. */
	clickAction: string
	/** May take the place of longer content (more than 6 lines), depending on your device. */
	subject: string
	/** Set the color of the notification icon. Use hex code or color name. */
	color: string
	/** When set to true, the notification will not be dissmissed when clicking on it. */
	sticky: boolean
	/** Set the notification channel. Creates a new channel if it doesn't exist. Call with "remove_channel" as message to remove the channel. */
	channel: string
	/** Set the notification channel's importance. */
	importance: "high" | "low" | "max" | "min" | "default"
	/** Set the notification channel's vibration pattern, e.g. "200, 100, 200". */
	vibrationPattern: string
	/** Set the notification channel's LED color. */
	ledColor: string
	/** Persistent notifications cannot be dismissed by the user.
	 * The tag property must be set to use this.
	 * The notification will still be dismissed when selected, use the sticky property to prevent this.
	 * Send "clear_notification" as message to clear the notification with the same tag.
	 * */
	persistent: boolean
	/* Set how long the notification should be displayed before dismissed automatically. (in seconds) */
	timeout: number
	/** Set the notification icon. */
	icon_url: string
	/** Change how much of a notification is visible on the lock screen. */
	visibility: "public" | "secret" | "private"
	/** Instead of posting a notification on the device you can instead get your device to speak the notification.
	 * Set message to "TTS" to use this.
	 * */
	tts_text: string
	/** Use alarm volume instead of media volume for TTS. */
	media_stream: "alarm_stream" | "alarm_stream_max"
	/** You can create notifications with a count up/down timer (chronometer) by passing the chronometer and when options. This feature requires at least Android 7.0. */
	chronometer: boolean
	/** The UTC timestamp to count up or down to with the chronometer option. */
	when: string
	/** Change the notification status bar icon. */
	notification_icon: string
	/** Show the notification in Android Auto. */
	car_ui: boolean
}

interface IosNotificationData extends CommonNotificationData {
	/** URL to open when clicking on the notification. */
	url: string
	/** A subtitle displays in addition to title and message. */
	subtitle: string
	/** Disable the default sound when the notification is received. */
	sound: "none"
	/** Set the app icon badge. Send a "delete_alert" message silently update the badge without displaying a notification. */
	badge: number
	/** Set the interrupt level of the notification. */
	"interruption-level": "active" | "passive" | "time-sensitive" | "critical"
	/** Control how a notification is displayed when the app is in the foreground */
	presentation_options: "badge" | "sound" | "alert"
	/** Trigger a shortcut */
	shortcut: {
		/** The name of the shortcut to trigger */
		name: string
		/** When set, does not re-open the Home Assistant app when completed. When set, the ios.shortcut_run event will not be fired. */
		ignore_result: "ignore"
	}
}

export class DeviceTracker<TDevicePlatform extends "ios" | "android"> extends Entity<
	DeviceTrackerEntityName,
	DeviceTrackerState,
	DeviceTrackerAttributes,
	DeviceTrackerEvent
> {
	public sendNotification(
		message: string,
		{
			title,
			data,
		}: {
			title?: string
			data?: Partial<TDevicePlatform extends "ios" ? IosNotificationData : AndroidNotificationData>
		}
	) {
		HassApi.getInstance().callService("notify", `mobile_app_${this.entityId.replace("device_tracker.", "")}`, {
			title,
			message,
			data,
		})
	}
	protected override onStateChange(oldState: DeviceTrackerState, oldAttributes: DeviceTrackerAttributes): void {}
}
