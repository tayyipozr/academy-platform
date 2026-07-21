package com.academy.platform.reporting;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import com.academy.platform.media.MediaStorageProperties;

import org.springframework.stereotype.Service;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

@Service
public class S3ReportStorage implements ReportStorage {

    private final S3Client s3Client;
    private final S3Presigner presigner;
    private final MediaStorageProperties mediaProperties;

    public S3ReportStorage(
            S3Client s3Client,
            S3Presigner presigner,
            MediaStorageProperties mediaProperties
    ) {
        this.s3Client = s3Client;
        this.presigner = presigner;
        this.mediaProperties = mediaProperties;
    }

    @Override
    public void store(
            String storageKey,
            byte[] content,
            String contentType
    ) {
        PutObjectRequest request =
                PutObjectRequest.builder()
                        .bucket(bucket())
                        .key(storageKey)
                        .contentType(contentType)
                        .contentLength(
                                (long) content.length
                        )
                        .build();

        s3Client.putObject(
                request,
                RequestBody.fromBytes(content)
        );
    }

    @Override
    public SignedReportDownload createDownloadUrl(
            String storageKey,
            String filename,
            Duration duration
    ) {
        GetObjectRequest getRequest =
                GetObjectRequest.builder()
                        .bucket(bucket())
                        .key(storageKey)
                        .responseContentType(
                                "application/pdf"
                        )
                        .responseContentDisposition(
                                "attachment; filename=\""
                                        + sanitizeFilename(
                                                filename
                                        )
                                        + "\""
                        )
                        .build();

        String url = presigner.presignGetObject(
                GetObjectPresignRequest.builder()
                        .signatureDuration(duration)
                        .getObjectRequest(getRequest)
                        .build()
        ).url().toString();

        return new SignedReportDownload(
                url,
                OffsetDateTime.now(ZoneOffset.UTC)
                        .plus(duration)
        );
    }

    @Override
    public void delete(String storageKey) {
        s3Client.deleteObject(
                DeleteObjectRequest.builder()
                        .bucket(bucket())
                        .key(storageKey)
                        .build()
        );
    }

    @Override
    public String bucket() {
        return mediaProperties.bucket();
    }

    private String sanitizeFilename(
            String filename
    ) {
        return filename
                .replace("\"", "")
                .replace("\r", "")
                .replace("\n", "");
    }
}
