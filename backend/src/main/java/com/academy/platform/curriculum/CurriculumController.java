package com.academy.platform.curriculum;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.academy.platform.authentication.AuthenticatedUser;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/curricula")
public class CurriculumController {

    private final CurriculumService curriculumService;
    private final CurriculumUnitService unitService;
    private final LearningOutcomeService outcomeService;

    public CurriculumController(
            CurriculumService curriculumService,
            CurriculumUnitService unitService,
            LearningOutcomeService outcomeService
    ) {
        this.curriculumService = curriculumService;
        this.unitService = unitService;
        this.outcomeService = outcomeService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('curricula.read')")
    public List<CurriculumResponse> findCurricula(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @RequestParam(defaultValue = "")
            String search,

            @RequestParam(required = false)
            UUID programId,

            @RequestParam(defaultValue = "false")
            boolean includeArchived
    ) {
        return curriculumService.findCurricula(
                currentUser.organizationId(),
                search,
                programId,
                includeArchived
        );
    }

    @GetMapping("/{curriculumId}")
    @PreAuthorize("hasAuthority('curricula.read')")
    public CurriculumResponse findCurriculum(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID curriculumId
    ) {
        return curriculumService.findCurriculum(
                currentUser.organizationId(),
                curriculumId
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('curricula.manage')")
    public ResponseEntity<CurriculumResponse> createCurriculum(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @Valid
            @RequestBody
            SaveCurriculumRequest request
    ) {
        CurriculumResponse curriculum =
                curriculumService.createCurriculum(
                        currentUser,
                        request
                );

        return ResponseEntity
                .created(
                        URI.create(
                                "/api/v1/curricula/"
                                        + curriculum.id()
                        )
                )
                .body(curriculum);
    }

    @PutMapping("/{curriculumId}")
    @PreAuthorize("hasAuthority('curricula.manage')")
    public CurriculumResponse updateCurriculum(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID curriculumId,

            @Valid
            @RequestBody
            SaveCurriculumRequest request
    ) {
        return curriculumService.updateCurriculum(
                currentUser,
                curriculumId,
                request
        );
    }

    @PostMapping("/{curriculumId}/status/{status}")
    @PreAuthorize("hasAuthority('curricula.manage')")
    public ResponseEntity<Void> updateStatus(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID curriculumId,

            @PathVariable
            CurriculumStatus status
    ) {
        curriculumService.updateStatus(
                currentUser,
                curriculumId,
                status
        );

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{curriculumId}/units")
    @PreAuthorize("hasAuthority('curricula.read')")
    public List<CurriculumUnitResponse> findUnits(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID curriculumId
    ) {
        return unitService.findUnits(
                currentUser.organizationId(),
                curriculumId
        );
    }

    @PostMapping("/{curriculumId}/units")
    @PreAuthorize("hasAuthority('curricula.manage')")
    public ResponseEntity<CurriculumUnitResponse> createUnit(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID curriculumId,

            @Valid
            @RequestBody
            SaveCurriculumUnitRequest request
    ) {
        CurriculumUnitResponse unit =
                unitService.createUnit(
                        currentUser,
                        curriculumId,
                        request
                );

        return ResponseEntity
                .created(
                        URI.create(
                                "/api/v1/curricula/"
                                        + curriculumId
                                        + "/units/"
                                        + unit.id()
                        )
                )
                .body(unit);
    }

    @PutMapping("/{curriculumId}/units/{unitId}")
    @PreAuthorize("hasAuthority('curricula.manage')")
    public CurriculumUnitResponse updateUnit(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID curriculumId,

            @PathVariable
            UUID unitId,

            @Valid
            @RequestBody
            SaveCurriculumUnitRequest request
    ) {
        return unitService.updateUnit(
                currentUser,
                curriculumId,
                unitId,
                request
        );
    }

    @GetMapping(
            "/{curriculumId}/units/{unitId}/outcomes"
    )
    @PreAuthorize("hasAuthority('curricula.read')")
    public List<LearningOutcomeResponse> findOutcomes(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID curriculumId,

            @PathVariable
            UUID unitId
    ) {
        return outcomeService.findOutcomes(
                currentUser.organizationId(),
                curriculumId,
                unitId
        );
    }

    @PostMapping(
            "/{curriculumId}/units/{unitId}/outcomes"
    )
    @PreAuthorize("hasAuthority('curricula.manage')")
    public ResponseEntity<LearningOutcomeResponse>
    createOutcome(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID curriculumId,

            @PathVariable
            UUID unitId,

            @Valid
            @RequestBody
            SaveLearningOutcomeRequest request
    ) {
        LearningOutcomeResponse outcome =
                outcomeService.createOutcome(
                        currentUser,
                        curriculumId,
                        unitId,
                        request
                );

        return ResponseEntity
                .created(
                        URI.create(
                                "/api/v1/curricula/"
                                        + curriculumId
                                        + "/units/"
                                        + unitId
                                        + "/outcomes/"
                                        + outcome.id()
                        )
                )
                .body(outcome);
    }

    @PutMapping(
            "/{curriculumId}/units/{unitId}"
                    + "/outcomes/{outcomeId}"
    )
    @PreAuthorize("hasAuthority('curricula.manage')")
    public LearningOutcomeResponse updateOutcome(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID curriculumId,

            @PathVariable
            UUID unitId,

            @PathVariable
            UUID outcomeId,

            @Valid
            @RequestBody
            SaveLearningOutcomeRequest request
    ) {
        return outcomeService.updateOutcome(
                currentUser,
                curriculumId,
                unitId,
                outcomeId,
                request
        );
    }
}
