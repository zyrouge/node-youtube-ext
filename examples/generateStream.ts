import fs from "fs";
import path from "path";
import { videoInfo, getFormats, getReadableStream } from "../src";

const query = "https://www.youtube.com/watch?v=jzJE2ZSH6Dk";

const start = async () => {
    await new Promise<void>(async (resolve, reject) => {
        try {
            const info = await videoInfo(query);
            const formats = await getFormats(info.streams);
            // Dont use this condition for livestreams
            const format = formats.find((x) => x.fps && x.audioChannels);
            const stream = await getReadableStream(format!);

            const filename = `${info.title} - ${info.channel.name}.mp4`.replace(
                /[^(\w|\d|-| |\.)+]/g,
                ""
            );
            const file = fs.createWriteStream(
                path.resolve(__dirname, filename)
            );
            const started = Date.now();
            let downloaded = 0;

            file.on("error", console.error);
            stream.on("error", console.error);

            stream.on("data", (data: any) => {
                downloaded += data.length;
                console.log(`Downloaded ${downloaded / 1000}kb`);
            });
            stream.pipe(file);
            stream.on("close", () => {
                console.log(
                    `Downloaded in ${(Date.now() - started) / 1000} seconds!`
                );
                return resolve();
            });
        } catch (err) {
            reject(err);
        }
    });
};

start();
