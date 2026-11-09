package utils

import (
	"errors"
	"fmt"
	"github.com/google/uuid"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type TokenType string

const (
	TokenTypeAccess  TokenType = "access"
	TokenTypeRefresh TokenType = "refresh"
)

const Issuer = "task-tracker"

type Claims struct {
	UserID       uuid.UUID `json:"sub"`
	TokenType    TokenType `json:"typ"`
	TokenVersion int64     `json:"ver"`
	jwt.RegisteredClaims
}

func GenerateAccess(userID uuid.UUID, version int64, secret []byte) (string, error) {
	return generate(userID, version, TokenTypeAccess, 15*time.Minute, secret)
}

func GenerateRefresh(userID uuid.UUID, version int64, secret []byte) (string, error) {
	return generate(userID, version, TokenTypeRefresh, 72*time.Hour, secret)
}

func ParseToken(tokenString string, expected TokenType, secret []byte) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(
		tokenString,
		claims,
		func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
			return secret, nil
		},
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(Issuer),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, errors.New("invalid token")
	}
	if claims.TokenType != expected {
		return nil, fmt.Errorf("expected %s token, got %s", expected, claims.TokenType)
	}
	return claims, nil
}

func generate(userID uuid.UUID, version int64, typ TokenType, ttl time.Duration, secret []byte) (string, error) {
	now := time.Now()
	claims := &Claims{
		UserID:       userID,
		TokenType:    typ,
		TokenVersion: version,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    Issuer,
			Subject:   userID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			ID:        uuid.NewString(),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret)
}
