import fs from 'fs';
import ytdl from "ytdl-core";
import cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { Song } from './models/song.model';
debugger



start();


async function start(){
    const [program, __, playlistId] = process.argv;
    const songs = await getSongsIds(playlistId);
    if(songs){
        console.log('Start downloading');
        for await (const songFileName of getSongsFileNames(songs)){
            console.log(`Done ${songFileName}`);
        }
        console.log('Done downloading');
    } else {
        console.log('no songs');
    }
    // .forEach(async vid=> await downloadVideo(vid));
}


async function* getSongsFileNames(songs: Array<Song>): AsyncIterableIterator<string> {
    for(const song of songs){
        yield await downloadVideo(song);
    }
}


function downloadVideo({id,name}: Song): Promise<string> {
    return new Promise((success,fail)=>{
        let video = ytdl(`https://www.youtube.com/watch?v=${id}`, {format: 'mp3'});
        
        video.pipe(fs.createWriteStream(`output/${name}.mp3`));
        
        video.on('end', () => {
            // console.log(`Done ${name}.mp3`);
            success(`${name}.mp3`);
        });
    });
}


async function getSongsIds(playlistId: string): Promise<Array<Song>|null> {
    const url = `https://www.youtube.com/playlist?list=${playlistId}`;
    const html = await getHtml(url);
    const songs = html && await extractVideosList(html) || null;
    // generate in Youtube page
    return songs;
}


function extractVideosList(html: string): Array<Song>{
    const $ = cheerio.load(html);
    let videos : Array<Song> = [];
    const domVideosArr = $('ytd-playlist-video-list-renderer a.ytd-playlist-video-renderer');
    domVideosArr.toArray().forEach(a => {
         const idArr =/(?<=watch\?v\=).*(?=\&list)/.exec(a.attribs.href);
         const id = idArr && idArr[0] || '';
         let  name = $(a).parent().find('#video-title').text();
         name = name && name.replace(/[^א-תa-zA-z ]/g,'').trim() || '';
         videos.push({id,name});
     })
     return videos;
 }



async function getHtml(url: string): Promise<string|null>  {
    const browser = await puppeteer.launch();
    const page = browser && await browser.newPage();
    const openUrl = page && await page.goto(url);
    const html = openUrl && await page.content();
    return html;
}