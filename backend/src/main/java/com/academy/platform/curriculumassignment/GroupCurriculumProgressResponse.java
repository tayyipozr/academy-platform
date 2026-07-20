package com.academy.platform.curriculumassignment;

import java.util.List;

public record GroupCurriculumProgressResponse(
        GroupCurriculumAssignmentResponse assignment,
        int totalUnitCount,
        int notStartedUnitCount,
        int inProgressUnitCount,
        int completedUnitCount,
        int totalEstimatedSessions,
        int completedSessionCount,
        double completionPercentage,
        List<CurriculumUnitProgressResponse> units
) {
    public GroupCurriculumProgressResponse {
        units = List.copyOf(units);
    }
}
