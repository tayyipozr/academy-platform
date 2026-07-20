package com.academy.platform.media;

import java.net.URL;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import org.springframework.stereotype.Service;

import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
public class MediaObjectStorageService {

    private final S3Client s3Client;
    private final S3Presigner presigner;
    private final MediaStorageProperties properties;

    public MediaObjectStorageService(
            S3Client s3Client,
            S3Presigner presigner,
            MediaStorageProperties properties
    ) {
        this.s3Client = s3Client;
        this.presigner = presigner;
        this.properties = properties;
    }

    public PresignedUpload createUploadUrl(
            String storageKey,
            String contentType
    ) {
        PutObjectRequest putObjectRequest =
                PutObjectRequest.builder()
                        .bucket(properties.bucket())
                        .key(storageKey)
                        .contentType(contentType)
                        .build();

        PutObjectPresignRequest presignRequest =
                PutObjectPresignRequest.builder()
                        .signatureDuration(
                                properties
                                        .uploadUrlDuration()
                        )
                        .putObjectRequest(
                                putObjectRequest
                        )
                        .build();

        PresignedPutObjectRequest result =
                presigner.presignPutObject(
                        presignRequest
                );

        return new PresignedUpload(
                result.url(),
                OffsetDateTime.now(ZoneOffset.UTC)
                        .plus(
                                properties
                                        .uploadUrlDuration()
                        )
        );
    }

    public PresignedDownload createDownloadUrl(
            String storageKey,
            String filename
    ) {
        GetObjectRequest getObjectRequest =
                GetObjectRequest.builder()
                        .bucket(properties.bucket())
                        .key(storageKey)
                        .responseContentDisposition(
                                "inline; filename=\""
                                        + sanitizeHeaderFilename(
                                                filename
                                        )
                                        + "\""
                        )
                        .build();

        GetObjectPresignRequest presignRequest =
                GetObjectPresignRequest.builder()
                        .signatureDuration(
                                properties
                                        .downloadUrlDuration()
                        )
                        .getObjectRequest(
                                getObjectRequest
                        )
                        .build();

        PresignedGetObjectRequest result =
                presigner.presignGetObject(
                        presignRequest
                );

        return new PresignedDownload(
                result.url(),
                OffsetDateTime.now(ZoneOffset.UTC)
                        .plus(
                                properties
                                        .downloadUrlDuration()
                        )
        );
    }

    public HeadObjectResponse headObject(
            String storageKey
    ) {
        return s3Client.headObject(
                HeadObjectRequest.builder()
                        .bucket(properties.bucket())
                        .key(storageKey)
                        .build()
        );
    }

    public void deleteObject(String storageKey) {
        s3Client.deleteObject(
                DeleteObjectRequest.builder()
                        .bucket(properties.bucket())
                        .key(storageKey)
                        .build()
        );
    }

    public String bucket() {
        return properties.bucket();
    }

    private String sanitizeHeaderFilename(
            String filename
    ) {
        return filename
                .replace("\"", "")
                .replace("\r", "")
                .replace("\n", "");
    }

    public record PresignedUpload(
            URL url,
            OffsetDateTime expiresAt
    ) {
    }

    public record PresignedDownload(
            URL url,
            OffsetDateTime expiresAt
    ) {
    }
}
