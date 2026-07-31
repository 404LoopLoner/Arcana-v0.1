# ============================================================
# ARCANA DESKTOP CORE V0.7
# Windows Gesture Control Bridge
# ============================================================

import asyncio
import json
import time

import websockets

from pycaw.pycaw import AudioUtilities

import win32api
import win32con


# ============================================================
# CONFIGURATION
# ============================================================

HOST = "127.0.0.1"
PORT = 8765

MEDIA_COOLDOWN = 0.8

last_media_command = 0


# ============================================================
# STARTUP
# ============================================================

print("")
print("==============================================")
print("              A R C A N A")
print("          DESKTOP CORE V0.7")
print("==============================================")
print("")


# ============================================================
# WINDOWS AUDIO INITIALIZATION
# ============================================================

def get_volume_interface():

    print("[AUDIO] Searching for Windows audio device...")

    device = AudioUtilities.GetSpeakers()

    print("[AUDIO] Speaker device detected:")
    print(device)

    # --------------------------------------------------------
    # NEWER PYCAW API
    # --------------------------------------------------------

    if hasattr(device, "EndpointVolume"):

        print(
            "[AUDIO] Using EndpointVolume interface."
        )

        return device.EndpointVolume

    # --------------------------------------------------------
    # SOME PYCAW VERSIONS
    # --------------------------------------------------------

    if hasattr(device, "endpoint_volume"):

        print(
            "[AUDIO] Using endpoint_volume interface."
        )

        return device.endpoint_volume

    # --------------------------------------------------------
    # DEBUG INFORMATION
    # --------------------------------------------------------

    print("")
    print("[AUDIO ERROR]")
    print(
        "Could not automatically locate "
        "Windows EndpointVolume."
    )

    print("")
    print(
        "Available AudioDevice attributes:"
    )

    for attribute in dir(device):

        if not attribute.startswith("_"):

            print(
                "   ",
                attribute
            )

    raise RuntimeError(
        "ARCANA could not initialize "
        "Windows master volume."
    )


# ============================================================
# INITIALIZE AUDIO
# ============================================================

try:

    volume_interface = (
        get_volume_interface()
    )

    print("")
    print(
        "[AUDIO] Windows Audio Core ONLINE"
    )

except Exception as error:

    volume_interface = None

    print("")
    print(
        "[AUDIO] Audio initialization failed:"
    )

    print(error)

    print("")
    print(
        "[CORE] ARCANA will continue running "
        "for media controls."
    )


# ============================================================
# SET WINDOWS MASTER VOLUME
# ============================================================

def set_windows_volume(percent):

    if volume_interface is None:

        print(
            "[AUDIO] Volume interface unavailable."
        )

        return

    try:

        percent = float(percent)

        percent = max(
            0,
            min(
                100,
                percent
            )
        )

        scalar = (
            percent /
            100.0
        )

        volume_interface.SetMasterVolumeLevelScalar(
            scalar,
            None
        )

        print(
            f"[AUDIO] MASTER VOLUME -> "
            f"{percent:.0f}%"
        )

    except Exception as error:

        print(
            "[AUDIO SET ERROR]",
            error
        )


# ============================================================
# GET WINDOWS MASTER VOLUME
# ============================================================

def get_windows_volume():

    if volume_interface is None:

        return 50

    try:

        scalar = (
            volume_interface
            .GetMasterVolumeLevelScalar()
        )

        percent = (
            scalar *
            100
        )

        return round(
            percent
        )

    except Exception as error:

        print(
            "[AUDIO READ ERROR]",
            error
        )

        return 50


# ============================================================
# MEDIA KEY ENGINE
# ============================================================

def press_media_key(key):

    try:

        win32api.keybd_event(
            key,
            0,
            0,
            0
        )

        time.sleep(
            0.04
        )

        win32api.keybd_event(
            key,
            0,
            win32con.KEYEVENTF_KEYUP,
            0
        )

    except Exception as error:

        print(
            "[MEDIA KEY ERROR]",
            error
        )


# ============================================================
# PLAY / PAUSE
# ============================================================

def media_play_pause():

    global last_media_command

    now = time.time()

    if (
        now -
        last_media_command <
        MEDIA_COOLDOWN
    ):

        return

    last_media_command = now

    print(
        "[MEDIA] PLAY / PAUSE"
    )

    press_media_key(
        win32con.VK_MEDIA_PLAY_PAUSE
    )


# ============================================================
# NEXT TRACK
# ============================================================

def media_next():

    print(
        "[MEDIA] NEXT TRACK"
    )

    press_media_key(
        win32con.VK_MEDIA_NEXT_TRACK
    )


# ============================================================
# PREVIOUS TRACK
# ============================================================

def media_previous():

    print(
        "[MEDIA] PREVIOUS TRACK"
    )

    press_media_key(
        win32con.VK_MEDIA_PREV_TRACK
    )


# ============================================================
# STOP MEDIA
# ============================================================

def media_stop():

    print(
        "[MEDIA] STOP"
    )

    press_media_key(
        win32con.VK_MEDIA_STOP
    )


# ============================================================
# WINDOWS VOLUME UP KEY
# ============================================================

def volume_up():

    print(
        "[AUDIO] VOLUME UP"
    )

    press_media_key(
        win32con.VK_VOLUME_UP
    )


# ============================================================
# WINDOWS VOLUME DOWN KEY
# ============================================================

def volume_down():

    print(
        "[AUDIO] VOLUME DOWN"
    )

    press_media_key(
        win32con.VK_VOLUME_DOWN
    )


# ============================================================
# WINDOWS MUTE
# ============================================================

def volume_mute():

    print(
        "[AUDIO] MUTE TOGGLE"
    )

    press_media_key(
        win32con.VK_VOLUME_MUTE
    )


# ============================================================
# SEND RESPONSE
# ============================================================

async def send_response(
    websocket,
    data
):

    try:

        await websocket.send(
            json.dumps(
                data
            )
        )

    except Exception as error:

        print(
            "[SOCKET SEND ERROR]",
            error
        )


# ============================================================
# PROCESS COMMAND FROM ARCANA WEB UI
# ============================================================

async def process_command(
    websocket,
    data
):

    command = data.get(
        "command"
    )

    if not command:

        return

    print(
        "[COMMAND]",
        command
    )

    # --------------------------------------------------------
    # SET EXACT WINDOWS VOLUME
    # --------------------------------------------------------

    if command == "SET_VOLUME":

        value = data.get(
            "value",
            50
        )

        set_windows_volume(
            value
        )

        await send_response(

            websocket,

            {
                "type": "VOLUME",

                "value":
                    get_windows_volume()
            }

        )

    # --------------------------------------------------------
    # GET WINDOWS VOLUME
    # --------------------------------------------------------

    elif command == "GET_VOLUME":

        await send_response(

            websocket,

            {
                "type": "VOLUME",

                "value":
                    get_windows_volume()
            }

        )

    # --------------------------------------------------------
    # VOLUME UP
    # --------------------------------------------------------

    elif command == "VOLUME_UP":

        volume_up()

    # --------------------------------------------------------
    # VOLUME DOWN
    # --------------------------------------------------------

    elif command == "VOLUME_DOWN":

        volume_down()

    # --------------------------------------------------------
    # MUTE
    # --------------------------------------------------------

    elif command == "VOLUME_MUTE":

        volume_mute()

    # --------------------------------------------------------
    # PLAY / PAUSE
    # --------------------------------------------------------

    elif command == "MEDIA_TOGGLE":

        media_play_pause()

    # --------------------------------------------------------
    # NEXT TRACK
    # --------------------------------------------------------

    elif command == "MEDIA_NEXT":

        media_next()

    # --------------------------------------------------------
    # PREVIOUS TRACK
    # --------------------------------------------------------

    elif command == "MEDIA_PREVIOUS":

        media_previous()

    # --------------------------------------------------------
    # STOP
    # --------------------------------------------------------

    elif command == "MEDIA_STOP":

        media_stop()

    # --------------------------------------------------------
    # PING
    # --------------------------------------------------------

    elif command == "PING":

        await send_response(

            websocket,

            {
                "type": "PONG",
                "status": "ARCANA_CORE_ONLINE"
            }

        )

    # --------------------------------------------------------
    # UNKNOWN COMMAND
    # --------------------------------------------------------

    else:

        print(
            "[CORE] Unknown command:",
            command
        )


# ============================================================
# ARCANA WEB CLIENT CONNECTION
# ============================================================

async def client_handler(
    websocket
):

    client_address = (
        websocket.remote_address
    )

    print("")
    print(
        "[CORE] ================================="
    )

    print(
        "[CORE] SPATIAL INTERFACE CONNECTED"
    )

    print(
        "[CORE] Client:",
        client_address
    )

    print(
        "[CORE] ================================="
    )

    print("")

    # --------------------------------------------------------
    # Tell browser that desktop core is ready
    # --------------------------------------------------------

    await send_response(

        websocket,

        {
            "type": "CONNECTED",

            "status":
                "ARCANA_DESKTOP_CORE_ONLINE",

            "volume":
                get_windows_volume(),

            "audioAvailable":
                volume_interface is not None
        }

    )

    try:

        async for message in websocket:

            try:

                data = json.loads(
                    message
                )

                await process_command(
                    websocket,
                    data
                )

            except json.JSONDecodeError:

                print(
                    "[CORE ERROR] Invalid JSON received."
                )

            except Exception as error:

                print(
                    "[COMMAND ERROR]",
                    error
                )

    except websockets.exceptions.ConnectionClosed:

        print(
            "[CORE] Spatial interface disconnected."
        )

    except Exception as error:

        print(
            "[CORE CONNECTION ERROR]",
            error
        )

    finally:

        print(
            "[CORE] Client disconnected."
        )


# ============================================================
# SERVER
# ============================================================

async def main():

    print("")
    print(
        "[CORE] Starting ARCANA WebSocket bridge..."
    )

    print(
        f"[CORE] Address: ws://{HOST}:{PORT}"
    )

    print("")

    # --------------------------------------------------------
    # Current Windows volume
    # --------------------------------------------------------

    current_volume = (
        get_windows_volume()
    )

    print(
        f"[AUDIO] Current Windows volume: "
        f"{current_volume}%"
    )

    print("")

    print(
        "[GESTURES]"
    )

    print(
        " RIGHT PINCH + ROTATE -> Windows Volume"
    )

    print(
        " RIGHT FIST           -> Play / Pause"
    )

    print(
        " LEFT PEACE           -> ARCANA Portal"
    )

    print("")

    print(
        "[CORE] Waiting for spatial interface..."
    )

    print("")

    # --------------------------------------------------------
    # Start WebSocket
    # --------------------------------------------------------

    async with websockets.serve(

        client_handler,

        HOST,

        PORT

    ):

        await asyncio.Future()


# ============================================================
# RUN ARCANA
# ============================================================

if __name__ == "__main__":

    try:

        asyncio.run(
            main()
        )

    except KeyboardInterrupt:

        print("")
        print(
            "[CORE] ARCANA Desktop Core shutdown."
        )

    except Exception as error:

        print("")
        print(
            "[FATAL CORE ERROR]"
        )

        print(
            error
        )