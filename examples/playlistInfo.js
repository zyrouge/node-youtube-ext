const { playlistInfo } = require("../dist");

const query = "https://www.youtube.com/playlist?list=PLzkuLC6Yvumv_Rd5apfPRWEcjf9b1JRnq&index=1";

const main = async () => {
    try {
        const info = await playlistInfo(query);

        console.log(
            `Title: ${info.title}`,
            `\nDescription: ${info.description}`,
            `\nURL: ${info.url}`,
            "\n"
        );

        if (info.videos.length) {
            console.log("-> Videos <-\n");
            info.videos.forEach((x, i) => {
                console.log(
                    `${i + 1}.`,
                    `\n   Title: ${x.title}`,
                    `\n   Channel: ${x.channel.name}`,
                    `\n   URL: ${x.url}`,
                    "\n"
                );
            });
        }
    } catch (err) {
        console.log(`No result were found for ${query}`);
    }
}

main();