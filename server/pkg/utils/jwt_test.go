package utils

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

var secret = []byte("test-secret-32-bytes-minimum-!!!!")

func TestRefreshTokenCannotBeUsedAsAccess(t *testing.T) {
	userID := uuid.New()

	refresh, err := GenerateRefresh(userID, 0, secret)
	require.NoError(t, err)
	require.NotEmpty(t, refresh)

	claims, err := ParseToken(refresh, TokenTypeAccess, secret)

	require.Error(t, err, "refresh token must not be accepted as access token")
	require.Nil(t, claims)
}

func TestAccessTokenIsAccepted(t *testing.T) {
	userID := uuid.New()

	access, err := GenerateAccess(userID, 0, secret)
	require.NoError(t, err)

	claims, err := ParseToken(access, TokenTypeAccess, secret)

	require.NoError(t, err)
	require.NotNil(t, claims)
	require.Equal(t, userID, claims.UserID)
}

func TestTokenHasJTI(t *testing.T) {
	userID := uuid.New()
	access, _ := GenerateAccess(userID, 0, secret)
	claims, err := ParseToken(access, TokenTypeAccess, secret)
	require.NoError(t, err)
	require.NotEmpty(t, claims.ID, "token must have jti")
}

func TestTokenHasIssuer(t *testing.T) {
	userID := uuid.New()
	access, _ := GenerateAccess(userID, 0, secret)
	claims, err := ParseToken(access, TokenTypeAccess, secret)
	require.NoError(t, err)
	require.NotEmpty(t, claims.Issuer, "token must have issuer")
}

func TestRejectTokenSignedWithDifferentSecret(t *testing.T) {
	userID := uuid.New()
	access, _ := GenerateAccess(userID, 0, []byte("another-secret-32-bytes-minimum!!!"))
	claims, err := ParseToken(access, TokenTypeAccess, secret)
	require.Error(t, err)
	require.Nil(t, claims)
}

func TestRejectExpiredToken(t *testing.T) {
	userID := uuid.New()

	token, err := generate(userID, 0, TokenTypeAccess, -1*time.Second, secret)
	require.NoError(t, err)

	claims, err := ParseToken(token, TokenTypeAccess, []byte("test-secret-32-bytes-minimum-!!!!"))

	require.Error(t, err)
	require.Nil(t, claims)
}
