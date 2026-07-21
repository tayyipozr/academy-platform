export function uploadToSignedUrl(
  url: string,
  file: File,
  requiredHeaders: Record<string, string>,
  onProgress: (percentage: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open("PUT", url);

    for (const [name, value] of Object.entries(
      requiredHeaders,
    )) {
      request.setRequestHeader(name, value);
    }

    request.upload.addEventListener(
      "progress",
      (event) => {
        if (!event.lengthComputable) {
          return;
        }

        onProgress(
          Math.round(
            (event.loaded / event.total) * 100,
          ),
        );
      },
    );

    request.addEventListener("load", () => {
      if (
        request.status >= 200 &&
        request.status < 300
      ) {
        onProgress(100);
        resolve();
        return;
      }

      reject(
        new Error(
          `Object upload failed with status ${request.status}.`,
        ),
      );
    });

    request.addEventListener("error", () => {
      reject(
        new Error(
          "The file could not be uploaded to object storage.",
        ),
      );
    });

    request.addEventListener("abort", () => {
      reject(new Error("The upload was cancelled."));
    });

    request.send(file);
  });
}
