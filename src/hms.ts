import axios from "axios";
import { HMSReactiveStore } from "@100mslive/hms-video-store";
import { HmsTokenResponse } from "./types";

const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL;
const hmsManager = new HMSReactiveStore();

// store will be used to get any state of the room
// actions will be used to perform an action in the room
export const hmsStore = hmsManager.getStore();
export const hmsActions = hmsManager.getActions();

export const fetchToken = async (
  userName: string,
  roomName: string
): Promise<HmsTokenResponse | any> => {
  try {
    // create or fetch the room_id for the passed in room
    const { data: room } = await axios.post(
      `${API_BASE_URL}/room`,
      { room: roomName },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // Generate the app/authToken
    const { data } = await axios.post(
      `${API_BASE_URL}/token`,
      {
        userId: userName,
        roomId: room.id,
        role: "host",
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return data.token;
  } catch (error: any) {
    throw error;
  }
};
