package com.academy.platform.media;

import java.net.URI;
import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.media")
public record MediaStorageProperties(
        URI internalEndpoint,
        URI publicEndpoint,
        String region,
        String bucket,
        String accessKey,
        String secretKey,
        boolean pathStyleAccess,
        boolean autoCreateBucket,
        Duration uploadUrlDuration,
        Duration downloadUrlDuration,
        long maximumImageSize,
        long maximumVideoSize,
        long maximumDocumentSize
        ) {

}
