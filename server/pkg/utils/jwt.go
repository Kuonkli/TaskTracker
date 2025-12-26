package utils

import (
	"errors"
	"log"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

func GenerateAccess(userID string, jwtSecret string) (string, error) {
	log.Println("User ID in generating ", userID)

	accessTokenExpirationTime := jwt.NewNumericDate(time.Now().Add(15 * time.Minute))
	accessClaims := &Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: accessTokenExpirationTime,
		},
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenString, err := accessToken.SignedString([]byte(jwtSecret))
	if err != nil {
		return "", err
	}
	return accessTokenString, nil
}

func GenerateRefresh(userID string, jwtSecret string) (string, error) {
	refreshTokenExpirationTime := jwt.NewNumericDate(time.Now().Add(72 * time.Hour))
	refreshClaims := &Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: refreshTokenExpirationTime,
		},
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err := refreshToken.SignedString([]byte(jwtSecret))
	if err != nil {
		return "", err
	}
	return refreshTokenString, nil
}

func ParseToken(tokenString, jwtSecret string) (*Claims, error) {
	claims := &Claims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	log.Println("Token Parse Success ", token.Valid)

	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	log.Println("Claims ", claims.UserID)
	return claims, nil
}

func RefreshAccess(refreshToken, jwtSecret string) (string, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(refreshToken, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(jwtSecret), nil
	})
	if err != nil || !token.Valid {
		return "", errors.New("invalid token")
	}

	return GenerateAccess(claims.UserID, jwtSecret)
}
