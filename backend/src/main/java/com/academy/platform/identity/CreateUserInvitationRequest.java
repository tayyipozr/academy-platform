package com.academy.platform.identity;

import java.util.Set;
import java.util.UUID;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

public record CreateUserInvitationRequest(

        @NotBlank
        @Email
        @Size(max = 320)
        String email,

        @NotBlank
        @Size(max = 100)
        String firstName,

        @NotBlank
        @Size(max = 100)
        String lastName,

        @NotEmpty
        Set<UUID> roleIds
) {
    public CreateUserInvitationRequest {
        roleIds = roleIds == null
                ? Set.of()
                : Set.copyOf(roleIds);
    }
}
