package com.academy.platform.enrollment;

import java.util.List;
import java.util.UUID;

public record GroupEnrollmentSummaryResponse(
        UUID groupId,
        int capacity,
        long activeEnrollmentCount,
        int availablePlaces,
        List<EnrollmentResponse> enrollments
) {
    public GroupEnrollmentSummaryResponse {
        enrollments = List.copyOf(enrollments);
    }
}
