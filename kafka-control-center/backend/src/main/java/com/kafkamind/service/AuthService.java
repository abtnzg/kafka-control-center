package com.kafkamind.service;

import com.kafkamind.model.User;
import com.kafkamind.repository.UserRepository;
import com.kafkamind.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public User register(String email, String rawPassword) {
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email déjà utilisé");
        }
        var user = User.builder()
            .email(email)
            .password(passwordEncoder.encode(rawPassword))
            .build();
        return userRepository.save(user);
    }

    public String login(String email, String rawPassword) {
        var user = userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Identifiants invalides"));
        if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
            throw new IllegalArgumentException("Identifiants invalides");
        }
        return jwtUtil.generate(email);
    }

    public User getByEmail(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }
}
