package com.academy.platform.configuration;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.academy.platform.media.MediaStorageProperties;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
@EnableConfigurationProperties(
        MediaStorageProperties.class
)
public class MediaStorageConfiguration {

    @Bean
    S3Configuration s3Configuration(
            MediaStorageProperties properties
    ) {
        return S3Configuration.builder()
                .pathStyleAccessEnabled(
                        properties.pathStyleAccess()
                )
                .build();
    }

    @Bean
    S3Client s3Client(
            MediaStorageProperties properties,
            S3Configuration s3Configuration
    ) {
        return S3Client.builder()
                .endpointOverride(
                        properties.internalEndpoint()
                )
                .region(
                        Region.of(properties.region())
                )
                .credentialsProvider(
                        credentialsProvider(properties)
                )
                .serviceConfiguration(
                        s3Configuration
                )
                .httpClientBuilder(
                        UrlConnectionHttpClient.builder()
                )
                .build();
    }

    @Bean
    S3Presigner s3Presigner(
            MediaStorageProperties properties,
            S3Configuration s3Configuration
    ) {
        return S3Presigner.builder()
                .endpointOverride(
                        properties.publicEndpoint()
                )
                .region(
                        Region.of(properties.region())
                )
                .credentialsProvider(
                        credentialsProvider(properties)
                )
                .serviceConfiguration(
                        s3Configuration
                )
                .build();
    }

    private StaticCredentialsProvider
            credentialsProvider(
                    MediaStorageProperties properties
            ) {
        return StaticCredentialsProvider.create(
                AwsBasicCredentials.create(
                        properties.accessKey(),
                        properties.secretKey()
                )
        );
    }
}
