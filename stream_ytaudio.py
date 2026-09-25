import argparse
import os
import subprocess

from googleapiclient.discovery import build
from yt_dlp import YoutubeDL

API_KEY = "AIzaSyAOe2u-E9cqANL8XwdjgwLyFVhgCMw9rR0"


def cerca_e_ascolta(query):
    youtube = build("youtube", "v3", developerKey=API_KEY)

    risposta = youtube.search().list(
        q=query,
        part="id,snippet",
        type="video",
        maxResults=1,
    ).execute()

    if not risposta["items"]:
        print("Nessun video trovato.")
        return

    video = risposta["items"][0]
    video_id = video["id"]["videoId"]
    titolo = video["snippet"]["title"]
    url = f"https://www.youtube.com/watch?v={video_id}"

    print(f"Riproduco: {titolo}")

    with YoutubeDL({
        "format": "bestaudio",
        "quiet": True,
        "noplaylist": True,
    }) as ydl:
        info = ydl.extract_info(url, download=False)
        audio_url = info["url"]

    subprocess.run(
        [
            "ffplay",
            "-nodisp",
            "-autoexit",
            "-i",
            audio_url,
        ],
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Cerca una canzone su YouTube e ne riproduce l'audio."
    )
    parser.add_argument(
        "nome_canzone",
        nargs="+",
        help="Titolo o artista da cercare",
    )
    args = parser.parse_args()

    cerca_e_ascolta(" ".join(args.nome_canzone))
