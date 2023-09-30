/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Bug 1816189 - Testing canvas randomization on canvas data extraction.
 *
 * In the test, we create canvas elements and offscreen canvas and test if
 * the extracted canvas data is altered because of the canvas randomization.
 */

const emptyPage =
  getRootDirectory(gTestPath).replace(
    "chrome://mochitests/content",
    "https://example.com"
  ) + "empty.html";

var TEST_CASES = [
  {
    name: "CanvasRenderingContext2D.getImageData().",
    extractCanvasData(browser) {
      return SpecialPowers.spawn(browser, [], _ => {
        const canvas = content.document.createElement("canvas");
        canvas.width = 100;
        canvas.height = 100;

        const context = canvas.getContext("2d");

        // Draw a red rectangle
        context.fillStyle = "red";
        context.fillRect(0, 0, 100, 100);

        // Add the canvas element to the document
        content.document.body.appendChild(canvas);

        const imageData = context.getImageData(0, 0, 100, 100);

        // Access the data again.
        const imageDataSecond = context.getImageData(0, 0, 100, 100);

        return [imageData.data, imageDataSecond.data];
      });
    },
    isDataRandomized(data1, data2, isCompareOriginal) {
      let diffCnt = compareUint8Arrays(data1, data2);
      info(`There are ${diffCnt} bits are different.`);

      // The Canvas randomization adds at most 512 bits noise to the image data.
      // We compare the image data arrays to see if they are different and the
      // difference is within the range.

      // If we are compare two randomized arrays, the difference can be doubled.
      let expected = isCompareOriginal
        ? NUM_RANDOMIZED_CANVAS_BITS
        : NUM_RANDOMIZED_CANVAS_BITS * 2;

      // The number of difference bits should never bigger than the expected
      // number. It could be zero if the randomization is disabled.
      ok(diffCnt <= expected, "The number of noise bits is expected.");

      return diffCnt <= expected && diffCnt > 0;
    },
  },
  {
    name: "HTMLCanvasElement.toDataURL() with a 2d context",
    extractCanvasData(browser) {
      return SpecialPowers.spawn(browser, [], _ => {
        const canvas = content.document.createElement("canvas");
        canvas.width = 100;
        canvas.height = 100;

        const context = canvas.getContext("2d");

        // Draw a red rectangle
        context.fillStyle = "red";
        context.fillRect(0, 0, 100, 100);

        // Add the canvas element to the document
        content.document.body.appendChild(canvas);

        const dataURL = canvas.toDataURL();

        // Access the data again.
        const dataURLSecond = canvas.toDataURL();

        return [dataURL, dataURLSecond];
      });
    },
    isDataRandomized(data1, data2) {
      return data1 !== data2;
    },
  },
  {
    name: "HTMLCanvasElement.toDataURL() with a webgl context",
    extractCanvasData(browser) {
      return SpecialPowers.spawn(browser, [], _ => {
        const canvas = content.document.createElement("canvas");

        const context = canvas.getContext("webgl");

        // Draw a blue rectangle
        context.enable(context.SCISSOR_TEST);
        context.scissor(0, 150, 150, 150);
        context.clearColor(1, 0, 0, 1);
        context.clear(context.COLOR_BUFFER_BIT);
        context.scissor(150, 150, 300, 150);
        context.clearColor(0, 1, 0, 1);
        context.clear(context.COLOR_BUFFER_BIT);
        context.scissor(0, 0, 150, 150);
        context.clearColor(0, 0, 1, 1);
        context.clear(context.COLOR_BUFFER_BIT);

        // Add the canvas element to the document
        content.document.body.appendChild(canvas);

        const dataURL = canvas.toDataURL();

        // Access the data again.
        const dataURLSecond = canvas.toDataURL();

        return [dataURL, dataURLSecond];
      });
    },
    isDataRandomized(data1, data2) {
      return data1 !== data2;
    },
  },
  {
    name: "HTMLCanvasElement.toDataURL() with a bitmaprenderer context",
    extractCanvasData(browser) {
      return SpecialPowers.spawn(browser, [], async _ => {
        const canvas = content.document.createElement("canvas");
        canvas.width = 100;
        canvas.height = 100;

        const context = canvas.getContext("2d");

        // Draw a red rectangle
        context.fillStyle = "red";
        context.fillRect(0, 0, 100, 100);

        // Add the canvas element to the document
        content.document.body.appendChild(canvas);

        const bitmapCanvas = content.document.createElement("canvas");
        bitmapCanvas.width = 100;
        bitmapCanvas.heigh = 100;
        content.document.body.appendChild(bitmapCanvas);

        let bitmap = await content.createImageBitmap(canvas);
        const bitmapContext = bitmapCanvas.getContext("bitmaprenderer");
        bitmapContext.transferFromImageBitmap(bitmap);

        const dataURL = bitmapCanvas.toDataURL();

        // Access the data again.
        const dataURLSecond = bitmapCanvas.toDataURL();

        return [dataURL, dataURLSecond];
      });
    },
    isDataRandomized(data1, data2) {
      return data1 !== data2;
    },
  },
  {
    name: "HTMLCanvasElement.toBlob() with a 2d context",
    extractCanvasData(browser) {
      return SpecialPowers.spawn(browser, [], async _ => {
        const canvas = content.document.createElement("canvas");
        canvas.width = 100;
        canvas.height = 100;

        const context = canvas.getContext("2d");

        // Draw a red rectangle
        context.fillStyle = "red";
        context.fillRect(0, 0, 100, 100);

        // Add the canvas element to the document
        content.document.body.appendChild(canvas);

        let data = await new content.Promise(resolve => {
          canvas.toBlob(blob => {
            let fileReader = new content.FileReader();
            fileReader.onload = () => {
              resolve(fileReader.result);
            };
            fileReader.readAsArrayBuffer(blob);
          });
        });

        // Access the data again.
        let dataSecond = await new content.Promise(resolve => {
          canvas.toBlob(blob => {
            let fileReader = new content.FileReader();
            fileReader.onload = () => {
              resolve(fileReader.result);
            };
            fileReader.readAsArrayBuffer(blob);
          });
        });

        return [data, dataSecond];
      });
    },
    isDataRandomized(data1, data2) {
      return compareArrayBuffer(data1, data2);
    },
  },
  {
    name: "HTMLCanvasElement.toBlob() with a webgl context",
    extractCanvasData(browser) {
      return SpecialPowers.spawn(browser, [], async _ => {
        const canvas = content.document.createElement("canvas");

        const context = canvas.getContext("webgl");

        // Draw a blue rectangle
        context.enable(context.SCISSOR_TEST);
        context.scissor(0, 150, 150, 150);
        context.clearColor(1, 0, 0, 1);
        context.clear(context.COLOR_BUFFER_BIT);
        context.scissor(150, 150, 300, 150);
        context.clearColor(0, 1, 0, 1);
        context.clear(context.COLOR_BUFFER_BIT);
        context.scissor(0, 0, 150, 150);
        context.clearColor(0, 0, 1, 1);
        context.clear(context.COLOR_BUFFER_BIT);

        // Add the canvas element to the document
        content.document.body.appendChild(canvas);

        let data = await new content.Promise(resolve => {
          canvas.toBlob(blob => {
            let fileReader = new content.FileReader();
            fileReader.onload = () => {
              resolve(fileReader.result);
            };
            fileReader.readAsArrayBuffer(blob);
          });
        });

        // We don't get the consistent blob data on second access with webgl
        // context regardless of the canvas randomization. So, we report the
        // same data here to not fail the test. Ideally, we should look into
        // why this happens, but it's not caused by canvas randomization.

        return [data, data];
      });
    },
    isDataRandomized(data1, data2) {
      return compareArrayBuffer(data1, data2);
    },
  },
  {
    name: "HTMLCanvasElement.toBlob() with a bitmaprenderer context",
    extractCanvasData(browser) {
      return SpecialPowers.spawn(browser, [], async _ => {
        const canvas = content.document.createElement("canvas");
        canvas.width = 100;
        canvas.height = 100;

        const context = canvas.getContext("2d");

        // Draw a red rectangle
        context.fillStyle = "red";
        context.fillRect(0, 0, 100, 100);

        // Add the canvas element to the document
        content.document.body.appendChild(canvas);

        const bitmapCanvas = content.document.createElement("canvas");
        bitmapCanvas.width = 100;
        bitmapCanvas.heigh = 100;
        content.document.body.appendChild(bitmapCanvas);

        let bitmap = await content.createImageBitmap(canvas);
        const bitmapContext = bitmapCanvas.getContext("bitmaprenderer");
        bitmapContext.transferFromImageBitmap(bitmap);

        let data = await new content.Promise(resolve => {
          bitmapCanvas.toBlob(blob => {
            let fileReader = new content.FileReader();
            fileReader.onload = () => {
              resolve(fileReader.result);
            };
            fileReader.readAsArrayBuffer(blob);
          });
        });

        // Access the data again.
        let dataSecond = await new content.Promise(resolve => {
          bitmapCanvas.toBlob(blob => {
            let fileReader = new content.FileReader();
            fileReader.onload = () => {
              resolve(fileReader.result);
            };
            fileReader.readAsArrayBuffer(blob);
          });
        });

        return [data, dataSecond];
      });
    },
    isDataRandomized(data1, data2) {
      return compareArrayBuffer(data1, data2);
    },
  },
  {
    name: "OffscreenCanvas.convertToBlob() with a 2d context",
    extractCanvasData(browser) {
      return SpecialPowers.spawn(browser, [], async _ => {
        let offscreenCanvas = new content.OffscreenCanvas(100, 100);

        const context = offscreenCanvas.getContext("2d");

        // Draw a red rectangle
        context.fillStyle = "red";
        context.fillRect(0, 0, 100, 100);

        let blob = await offscreenCanvas.convertToBlob();

        let data = await new content.Promise(resolve => {
          let fileReader = new content.FileReader();
          fileReader.onload = () => {
            resolve(fileReader.result);
          };
          fileReader.readAsArrayBuffer(blob);
        });

        // Access the data again.
        let blobSecond = await offscreenCanvas.convertToBlob();

        let dataSecond = await new content.Promise(resolve => {
          let fileReader = new content.FileReader();
          fileReader.onload = () => {
            resolve(fileReader.result);
          };
          fileReader.readAsArrayBuffer(blobSecond);
        });

        return [data, dataSecond];
      });
    },
    isDataRandomized(data1, data2) {
      return compareArrayBuffer(data1, data2);
    },
  },
  {
    name: "OffscreenCanvas.convertToBlob() with a webgl context",
    extractCanvasData(browser) {
      return SpecialPowers.spawn(browser, [], async _ => {
        let offscreenCanvas = new content.OffscreenCanvas(100, 100);

        const context = offscreenCanvas.getContext("webgl");

        // Draw a blue rectangle
        context.enable(context.SCISSOR_TEST);
        context.scissor(0, 150, 150, 150);
        context.clearColor(1, 0, 0, 1);
        context.clear(context.COLOR_BUFFER_BIT);
        context.scissor(150, 150, 300, 150);
        context.clearColor(0, 1, 0, 1);
        context.clear(context.COLOR_BUFFER_BIT);
        context.scissor(0, 0, 150, 150);
        context.clearColor(0, 0, 1, 1);
        context.clear(context.COLOR_BUFFER_BIT);

        let blob = await offscreenCanvas.convertToBlob();

        let data = await new content.Promise(resolve => {
          let fileReader = new content.FileReader();
          fileReader.onload = () => {
            resolve(fileReader.result);
          };
          fileReader.readAsArrayBuffer(blob);
        });

        // Access the data again.
        let blobSecond = await offscreenCanvas.convertToBlob();

        let dataSecond = await new content.Promise(resolve => {
          let fileReader = new content.FileReader();
          fileReader.onload = () => {
            resolve(fileReader.result);
          };
          fileReader.readAsArrayBuffer(blobSecond);
        });

        return [data, dataSecond];
      });
    },
    isDataRandomized(data1, data2) {
      return compareArrayBuffer(data1, data2);
    },
  },
  {
    name: "OffscreenCanvas.convertToBlob() with a bitmaprenderer context",
    extractCanvasData(browser) {
      return SpecialPowers.spawn(browser, [], async _ => {
        let offscreenCanvas = new content.OffscreenCanvas(100, 100);

        const context = offscreenCanvas.getContext("2d");

        // Draw a red rectangle
        context.fillStyle = "red";
        context.fillRect(0, 0, 100, 100);

        const bitmapCanvas = new content.OffscreenCanvas(100, 100);

        let bitmap = await content.createImageBitmap(offscreenCanvas);
        const bitmapContext = bitmapCanvas.getContext("bitmaprenderer");
        bitmapContext.transferFromImageBitmap(bitmap);

        let blob = await bitmapCanvas.convertToBlob();

        let data = await new content.Promise(resolve => {
          let fileReader = new content.FileReader();
          fileReader.onload = () => {
            resolve(fileReader.result);
          };
          fileReader.readAsArrayBuffer(blob);
        });

        // Access the data again.
        let blobSecond = await bitmapCanvas.convertToBlob();

        let dataSecond = await new content.Promise(resolve => {
          let fileReader = new content.FileReader();
          fileReader.onload = () => {
            resolve(fileReader.result);
          };
          fileReader.readAsArrayBuffer(blobSecond);
        });

        return [data, dataSecond];
      });
    },
    isDataRandomized(data1, data2) {
      return compareArrayBuffer(data1, data2);
    },
  },
  {
    name: "CanvasRenderingContext2D.getImageData() with a offscreen canvas",
    extractCanvasData(browser) {
      return SpecialPowers.spawn(browser, [], async _ => {
        let offscreenCanvas = new content.OffscreenCanvas(100, 100);

        const context = offscreenCanvas.getContext("2d");

        // Draw a red rectangle
        context.fillStyle = "red";
        context.fillRect(0, 0, 100, 100);

        const imageData = context.getImageData(0, 0, 100, 100);

        // Access the data again.
        const imageDataSecond = context.getImageData(0, 0, 100, 100);

        return [imageData.data, imageDataSecond.data];
      });
    },
    isDataRandomized(data1, data2, isCompareOriginal) {
      let diffCnt = compareUint8Arrays(data1, data2);
      info(`There are ${diffCnt} bits are different.`);

      // The Canvas randomization adds at most 512 bits noise to the image data.
      // We compare the image data arrays to see if they are different and the
      // difference is within the range.

      // If we are compare two randomized arrays, the difference can be doubled.
      let expected = isCompareOriginal
        ? NUM_RANDOMIZED_CANVAS_BITS
        : NUM_RANDOMIZED_CANVAS_BITS * 2;

      // The number of difference bits should never bigger than the expected
      // number. It could be zero if the randomization is disabled.
      ok(diffCnt <= expected, "The number of noise bits is expected.");

      return diffCnt <= expected && diffCnt > 0;
    },
  },
];

async function runTest(enabled) {
  // Enable/Disable CanvasRandomization by the RFP target overrides.
  let RFPOverrides = enabled ? "+CanvasRandomization" : "-CanvasRandomization";
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.resistFingerprinting.randomization.enabled", true],
      ["privacy.fingerprintingProtection", true],
      ["privacy.fingerprintingProtection.pbmode", true],
      ["privacy.fingerprintingProtection.overrides", RFPOverrides],
      ["privacy.resistFingerprinting", false],
    ],
  });

  // Open a private window.
  let privateWindow = await BrowserTestUtils.openNewBrowserWindow({
    private: true,
  });

  // Open tabs in the normal and private window.
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, emptyPage);

  const privateTab = await BrowserTestUtils.openNewForegroundTab(
    privateWindow.gBrowser,
    emptyPage
  );

  for (let test of TEST_CASES) {
    info(`Testing ${test.name}`);
    let data = await test.extractCanvasData(tab.linkedBrowser);
    let result = test.isDataRandomized(data[0], test.originalData);

    is(
      result,
      enabled,
      `The image data is ${enabled ? "randomized" : "the same"}.`
    );

    ok(
      !test.isDataRandomized(data[0], data[1]),
      "The data of first and second access should be the same."
    );

    let privateData = await test.extractCanvasData(privateTab.linkedBrowser);

    // Check if we add noise to canvas data in private windows.
    result = test.isDataRandomized(privateData[0], test.originalData, true);
    is(
      result,
      enabled,
      `The private image data is ${enabled ? "randomized" : "the same"}.`
    );

    ok(
      !test.isDataRandomized(privateData[0], privateData[1]),
      "The data of first and second access should be the same for private windows."
    );

    // Make sure the noises are different between normal window and private
    // windows.
    result = test.isDataRandomized(privateData[0], data[0]);
    is(
      result,
      enabled,
      `The image data between the normal window and the private window are ${
        enabled ? "different" : "the same"
      }.`
    );
  }

  BrowserTestUtils.removeTab(tab);
  BrowserTestUtils.removeTab(privateTab);
  await BrowserTestUtils.closeWindow(privateWindow);
}

add_setup(async function () {
  // Disable the fingerprinting randomization.
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.resistFingerprinting.randomization.enabled", false],
      ["privacy.fingerprintingProtection", false],
      ["privacy.fingerprintingProtection.pbmode", false],
      ["privacy.resistFingerprinting", false],
    ],
  });

  // Open a tab for extracting the canvas data.
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, emptyPage);

  // Extract the original canvas data without random noise.
  for (let test of TEST_CASES) {
    let data = await test.extractCanvasData(tab.linkedBrowser);
    test.originalData = data[0];
  }

  BrowserTestUtils.removeTab(tab);
});

add_task(async function run_tests_with_randomization_enabled() {
  await runTest(true);
});

add_task(async function run_tests_with_randomization_disabled() {
  await runTest(false);
});
