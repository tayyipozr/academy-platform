package com.academy.platform.common;

import java.util.List;

public record PageResponse<T>(
        List<T> data,
        PageMetadata page
) {

    public PageResponse {
        data = List.copyOf(data);
    }

    public record PageMetadata(
            int number,
            int size,
            long totalElements,
            int totalPages
    ) {
    }

    public static <T> PageResponse<T> of(
            List<T> data,
            int pageNumber,
            int pageSize,
            long totalElements
    ) {
        int totalPages = totalElements == 0
                ? 0
                : (int) Math.ceil(
                        (double) totalElements / pageSize
                );

        return new PageResponse<>(
                data,
                new PageMetadata(
                        pageNumber,
                        pageSize,
                        totalElements,
                        totalPages
                )
        );
    }
}
