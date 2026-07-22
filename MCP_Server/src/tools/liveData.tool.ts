import { getCachedLiveData } from "../services/plc.service";

export const liveDataSchema = {}; 

export const liveDataHandler = async () => {
  const data = getCachedLiveData();

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2)
      }
    ],
    structuredContent: data
  };
};
