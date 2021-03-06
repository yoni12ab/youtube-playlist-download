import fs from 'fs';

import cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { Song } from './models/song.model';
import { Worker } from 'worker_threads';

start();
async function start() {
  const [program, __, playlistId] = process.argv;
  console.log('playlistId', playlistId);
  const songs = await getSongsIds(playlistId);
  if (songs && songs.length) {
    console.log('Start downloading');
    for await (const songFileName of getSongsFileNames(songs)) {
      console.log(`Done ${songFileName}`);
    }
    console.log('Done downloading');
  } else {
    console.log('no songs');
  }
}

async function* getSongsFileNames(
  songs: Array<Song>
): AsyncIterableIterator<string> {
  for (const song of songs) {
    yield await downloadVideo(song);
  }
}

function cleanStr(str: string): string {
  return str.replace(/[^א-ת\w\s]/gi, '');
}

function downloadVideo(song: Song): Promise<string> {
  return new Promise((success, fail) => {
    const fileName = `${song.name}.mp3`;
    if (!fs.existsSync(fileName)) {
      try {
        const worker = new Worker(`${__dirname}/downloadWorker.js`, {
          workerData: { song, fileName },
        });
        worker.on('message', () => {
          worker.terminate(() => success(`${song.name}.mp3`));
        });
        worker.on('error', (err) => {
          worker.terminate(() =>
            success(`ERROR ${song.name}.mp3 : ${err.message}`)
          );
        });
        worker.on('exit', (code) => {
          if (code !== 0) {
            worker.terminate(() => success(`ERROR ${song.name}.mp3`));
          }

          worker.terminate(() => success(`${song.name}.mp3`));
        });
      } catch (error) {
        console.log('stderr', error);
        success(`error ${error}`);
      }
    } else {
      success(`already exists ${song.name}.mp3`);
    }
  });
}

async function getSongsIds(playlistId: string): Promise<Array<Song> | null> {
  const url = `https://www.youtube.com/playlist?list=${playlistId}`;
  const html = await getHtml(url);
  const songs = (html && (await extractVideosList(html))) || null;
  return songs;
}

function extractVideosList(html: string): Array<Song> {
  const $ = cheerio.load(html);
  let videos: Array<Song> = [];
  const domVideosArr = $(
    'ytd-playlist-video-list-renderer a.ytd-playlist-video-renderer'
  );
  domVideosArr.toArray().forEach((a) => {
    const idArr = /(?<=watch\?v\=).*(?=\&list)/.exec(a.attribs.href);
    const id = (idArr && idArr[0]) || '';
    let name = $(a).parent().find('#video-title').text();
    name =
      (name &&
        cleanStr(name)
          .replace(/[^א-תa-zA-z ]/g, '')
          .trim()) ||
      '';
    videos.push({ id, name });
  });
  return videos;
}

async function getHtml(url: string): Promise<string | null> {
  const browser = await puppeteer.launch();
  const page = browser && (await browser.newPage());
  const openUrl = page && (await page.goto(url));
  const html = openUrl && (await page.content());
  return html;
}
