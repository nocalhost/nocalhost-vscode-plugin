const _ = require("lodash");
const ffmpeg = require("fluent-ffmpeg");
const stream = require("stream");
const Bluebird = require("bluebird");
const { path: ffmpegPath } = require("@ffmpeg-installer/ffmpeg");

ffmpeg.setFfmpegPath(ffmpegPath);

const deferredPromise = function () {
  let reject;
  let resolve;
  const promise = new Bluebird((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  return { promise, resolve, reject };
};

class VideoCapture {
  constructor() {
    this.pt = new stream.PassThrough();
    this.ended = deferredPromise();
    this.skippedChunksCount = 0;
    this.writtenChunksCount = 0;
    this.done = false;
    this.wantsWrite = true;
  }

  end(waitForMoreChunksTimeout = 3000) {
    // in some cases (webm) ffmpeg will crash if fewer than 2 buffers are
    // written to the stream, so we don't end capture until we get at least 2
    if (this.writtenChunksCount < 2) {
      return new Bluebird((resolve) => {
        this.pt.once("data", resolve);
      })
        .then(() => endVideoCapture())
        .timeout(waitForMoreChunksTimeout);
    }

    this.done = true;

    this.pt.end();

    // return the ended promise which will eventually
    // get resolve or rejected
    return this.ended.promise;
  }

  writeVideoFrame(data) {
    // make sure we haven't ended
    // our stream yet because paint
    // events can linger beyond
    // finishing the actual video
    if (this.done) {
      return;
    }

    // when `data` is empty, it is sent as an empty Buffer (`<Buffer >`)
    // which can crash the process. this can happen if there are
    // errors in the video capture process, which are handled later
    // on, so just skip empty frames here.
    // @see https://github.com/cypress-io/cypress/pull/6818
    if (_.isEmpty(data)) {
      return;
    }

    this.writtenChunksCount++;

    if (this.wantsWrite) {
      if (!(this.wantsWrite = this.pt.write(data))) {
        return this.pt.once("drain", () => {
          this.wantsWrite = true;
        });
      }
    } else {
      this.skippedChunksCount += 1;
    }
  }

  start(name, options = {}) {
    _.defaults(options, {
      onError() {},
    });

    return new Bluebird((resolve) => {
      const cmd = ffmpeg({
        source: this.pt,
        priority: 20,
      })
        .videoCodec("libx264")
        .outputOptions("-preset ultrafast")
        .on("start", (command) => {
          return resolve({
            cmd,
            startedVideoCapture: new Date(),
          });
        })
        .on("error", (err, stdout, stderr) => {
          // bubble errors up
          options.onError?.(err, stdout, stderr);

          // reject the ended promise
          return ended.reject(err);
        })
        .on("end", () => {
          return ended.resolve();
        })

        // this is to prevent the error "invalid data input" error
        // when input frames have an odd resolution
        .videoFilters(`crop='floor(in_w/2)*2:floor(in_h/2)*2'`);

      cmd
        .inputFormat("image2pipe")
        .inputOptions("-use_wallclock_as_timestamps 1");

      return cmd.save(name);
    });
  }
}

module.exports = VideoCapture;
