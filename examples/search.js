const { search } = require("../dist");

const query = "ncs";

const main = async () => {
    try {
        const {
            videos, /* Videos */
            channels, /* Channels */
            playlists /* Playlists */
        } = await search(query);

        if (videos.length) {
            console.log("-> Videos <-\n");
            videos.forEach((x, i) => {
                console.log(
                    `${i + 1}.`,
                    `\n   Title: ${x.title}`,
                    `\n   Channel: ${x.channel.name}`,
                    `\n   URL: ${x.url}`,
                    "\n"
                );
            });
        }


        if (channels.length) {
            console.log("-> Channels <-\n");
            channels.forEach((x, i) => {
                console.log(
                    `${i + 1}.`,
                    `\n   Name: ${x.name}`,
                    `\n   Subscribers: ${x.subscribers.pretty}`,
                    `\n   URL: ${x.url}`,
                    "\n"
                );
            });
        }

        if (playlists.length) {
            console.log("-> Playlists <-\n");
            playlists.forEach((x, i) => {
                console.log(
                    `${i + 1}.`,
                    `\n   Name: ${x.name}`,
                    `\n   Videos: ${x.videoCount}`,
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