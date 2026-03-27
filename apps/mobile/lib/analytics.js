import { api } from "./api";
export const track = async (token, event, payload) => {
    try {
        await api.track(token, event, payload);
    }
    catch (error) {
        console.log("[analytics:error]", error);
    }
};
