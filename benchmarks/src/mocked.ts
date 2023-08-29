import { Readable } from "stream";

export class MockQueries {
    static searchText = "faded";

    static videoID = "Sn1rJbZ8nI4";
    static videoURL = `https://www.youtube.com/watch?v=${this.videoID}`;

    static playlistID = "PL8F6B0753B2CCA128";
    static playlistURL = `https://www.youtube.com/playlist?list=${this.playlistID}`;

    static channelID = "UCBUK-I-ILqsQoqIe8i6zrVg";
    static channelURL = `https://www.youtube.com/channel/${this.channelID}`;
}

export const consumeStream = async (stream: Readable) => {
    return new Promise<void>((resolve, reject) => {
        stream.on("data", () => {});
        stream.on("error", (err) => {
            reject(err);
        });
        stream.on("end", () => {
            resolve();
        });
    });
};
