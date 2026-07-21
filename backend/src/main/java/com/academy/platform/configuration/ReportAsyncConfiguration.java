package com.academy.platform.configuration;

import java.util.concurrent.Executor;

import com.academy.platform.reporting.ReportProperties;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
@EnableAsync
@EnableConfigurationProperties(
        ReportProperties.class
)
public class ReportAsyncConfiguration {

    @Bean(name = "reportTaskExecutor")
    Executor reportTaskExecutor(
            ReportProperties properties
    ) {
        ThreadPoolTaskExecutor executor =
                new ThreadPoolTaskExecutor();

        executor.setCorePoolSize(
                properties.executor()
                        .corePoolSize()
        );

        executor.setMaxPoolSize(
                properties.executor()
                        .maximumPoolSize()
        );

        executor.setQueueCapacity(
                properties.executor()
                        .queueCapacity()
        );

        executor.setThreadNamePrefix(
                "report-export-"
        );

        executor.setWaitForTasksToCompleteOnShutdown(
                true
        );

        executor.setAwaitTerminationSeconds(30);
        executor.initialize();

        return executor;
    }
}
