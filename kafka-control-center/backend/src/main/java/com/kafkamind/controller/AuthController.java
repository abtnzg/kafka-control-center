package com.kafkamind.controller;

import com.kafkamind.service.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody AuthRequest req) {
        var user = authService.register(req.email(), req.password());
        return ResponseEntity.status(201).body(
            new AuthResponse("Compte créé", null, user.getEmail(), user.getPlan().name())
        );
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequest req) {
        var token = authService.login(req.email(), req.password());
        var user = authService.getByEmail(req.email());
        return ResponseEntity.ok(
            new AuthResponse("Connecté", token, user.getEmail(), user.getPlan().name())
        );
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@AuthenticationPrincipal UserDetails userDetails) {
        var user = authService.getByEmail(userDetails.getUsername());
        return ResponseEntity.ok(new AuthResponse(
            null, null, user.getEmail(), user.getPlan().name()
        ));
    }

    record AuthRequest(
        @Email @NotBlank String email,
        @NotBlank @Size(min = 8) String password
    ) {}

    record AuthResponse(String message, String token, String email, String plan) {}
}
