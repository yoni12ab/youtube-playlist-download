import { workerData, parentPort } from 'worker_threads';
import ytdl, { downloadFromInfo } from "ytdl-core";
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffmpeg  = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// You can do any heavy stuff here, in a synchronous way
// without blocking the "main thread"

download();

function download(){
    try {
        const {song , fileName} = workerData;
        
        let videoStream = ytdl(`https://www.youtube.com/watch?v=${song.id}`);
        ffmpeg({source:videoStream})
        .audioCodec('libmp3lame')
        .audioBitrate(128)
        .format('mp3')
        .on('error', (err: any) => {
            parentPort && parentPort.postMessage({ err , status: 'Error' })
        })
        .on('end', () => {
            console.log('Going to write tons of content on file '+ song.name);
            parentPort && parentPort.postMessage({ fileName: song.name, status: 'Done' })
        })
        .save(fileName);
    } catch (error) {
        parentPort && parentPort.postMessage({ error , status: 'Error' })
    }
    
    
}


