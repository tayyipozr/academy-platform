package com.academy.platform.media;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.S3Exception;

@Component
public class MediaBucketInitializer
        implements ApplicationRunner {

    private final S3Client s3Client;
    private final MediaStorageProperties properties;

    public MediaBucketInitializer(
            S3Client s3Client,
            MediaStorageProperties properties
    ) {
        this.s3Client = s3Client;
        this.properties = properties;
    }

    @Override
    public void run(ApplicationArguments arguments) {
        if (!properties.autoCreateBucket()) {
            return;
        }

        try {
            s3Client.headBucket(
                    HeadBucketRequest.builder()
                            .bucket(properties.bucket())
                            .build()
            );
        } catch (
                NoSuchBucketException exception
        ) {
            createBucket();
        } catch (S3Exception exception) {
            if (exception.statusCode() == 404) {
                createBucket();
                return;
            }

            throw exception;
        }
    }

    private void createBucket() {
        s3Client.createBucket(
                CreateBucketRequest.builder()
                        .bucket(properties.bucket())
                        .build()
        );
    }
}
