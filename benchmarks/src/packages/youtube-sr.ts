import youtubeSr from "youtube-sr";
import { BenchmarkTasks } from "../benchmarker";
import { MockQueries } from "../mocked";

export const name = "youtube-sr";

export const tasks: BenchmarkTasks = {
    search: async () => {
        await youtubeSr.search(MockQueries.searchText);
    },
    video: async () => {
        await youtubeSr.getVideo(MockQueries.videoURL);
    },
    playlist: async () => {
        await youtubeSr.getPlaylist(MockQueries.playlistURL, {
            fetchAll: true,
        });
    },
};
