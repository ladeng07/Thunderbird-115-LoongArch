/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* import-globals-from ../../head.js */

const { Rect } = ChromeUtils.importESModule(
  "resource://gre/modules/Geometry.sys.mjs"
);

async function draw(window, src) {
  const { document, Image } = window;

  const promise = new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = function () {
      // Create a new offscreen canvas
      const canvas = document.createElementNS(
        "http://www.w3.org/1999/xhtml",
        "canvas"
      );
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");

      ctx.drawImage(img, 0, 0);

      resolve(canvas);
    };

    img.onerror = function () {
      reject(`error loading image ${src}`);
    };

    // Load the src image for drawing
    img.src = src;
  });

  return promise;
}

async function compareImages(window, expected, test) {
  const testCanvas = await draw(window, test);
  const expectedCanvas = await draw(window, expected);

  is(
    testCanvas.width,
    expectedCanvas.width,
    "The test and expected images must be the same size"
  );
  is(
    testCanvas.height,
    expectedCanvas.height,
    "The test and expected images must be the same size"
  );

  var maxDifference = {};
  var differences = window.windowUtils.compareCanvases(
    expectedCanvas,
    testCanvas,
    maxDifference
  );

  // Fuzz for minor differences that can be caused by the encoder.
  if (maxDifference.value > 1) {
    return differences;
  }
  return 0;
}

async function cropAndCompare(window, src, expected, test, region, subregions) {
  await TestRunner._cropImage(window, src, region, subregions, test);

  return compareImages(window, expected, PathUtils.toFileURI(test));
}

add_task(async function crop() {
  const window = Services.wm.getMostRecentWindow("navigator:browser");

  const tmp = PathUtils.tempDir;
  is(
    await cropAndCompare(
      window,
      "resource://mozscreenshots/lib/robot.png",
      "resource://mozscreenshots/lib/robot_upperleft.png",
      PathUtils.join(tmp, "test_cropped_upperleft.png"),
      new Rect(0, 0, 32, 32),
      [new Rect(0, 0, 32, 32)]
    ),
    0,
    "The image should be cropped to the upper left quadrant"
  );

  is(
    await cropAndCompare(
      window,
      "resource://mozscreenshots/lib/robot.png",
      "resource://mozscreenshots/lib/robot_center.png",
      PathUtils.join(tmp, "test_cropped_center.png"),
      new Rect(16, 16, 32, 32),
      [new Rect(16, 16, 32, 32)]
    ),
    0,
    "The image should be cropped to the center of the image"
  );

  is(
    await cropAndCompare(
      window,
      "resource://mozscreenshots/lib/robot.png",
      "resource://mozscreenshots/lib/robot_uncropped.png",
      PathUtils.join(tmp, "test_uncropped.png"),
      new Rect(-8, -9, 80, 80),
      [new Rect(-8, -9, 80, 80)]
    ),
    0,
    "The image should be not be cropped, and the cropping region should be clipped to the size of the image"
  );

  is(
    await cropAndCompare(
      window,
      "resource://mozscreenshots/lib/robot.png",
      "resource://mozscreenshots/lib/robot_diagonal.png",
      PathUtils.join(tmp, "test_diagonal.png"),
      new Rect(0, 0, 64, 64),
      [
        new Rect(0, 0, 16, 16),
        new Rect(16, 16, 16, 16),
        new Rect(32, 32, 16, 16),
        new Rect(48, 48, 16, 16),
      ]
    ),
    0,
    "The image should be contain squares across the diagonal"
  );

  is(
    await cropAndCompare(
      window,
      "resource://mozscreenshots/lib/robot.png",
      "resource://mozscreenshots/lib/robot_cropped_diagonal.png",
      PathUtils.join(tmp, "test_cropped_diagonal.png"),
      new Rect(16, 16, 48, 48),
      [new Rect(16, 16, 16, 16), new Rect(32, 32, 16, 16)]
    ),
    0,
    "The image should be cropped with squares across the diagonal"
  );
});
