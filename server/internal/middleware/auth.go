package middleware

import (
	"github.com/gin-gonic/gin"
	"log"
	"net/http"
	"task-tracker/pkg/utils"
)

func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		accessStr, err := c.Cookie("access_token")
		if err != nil || accessStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing access token"})
			c.Abort()
			return
		}
		refreshStr, err := c.Cookie("refresh_token")
		if err != nil || refreshStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing refresh token"})
			c.Abort()
			return
		}

		claims, err := utils.ParseToken(accessStr, jwtSecret)
		if err == nil {
			// Access токен ВАЛИДЕН - используем его
			log.Println("Access token user_id: " + claims.UserID)
			c.Set("user_id", claims.UserID)
			c.Next()
			return
		}

		log.Println("Invalid access token ", err.Error())
		log.Println("Access token expired, refreshing...")
		newAccess, err := utils.RefreshAccess(refreshStr, jwtSecret)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "token expired"})
			c.Abort()
			return
		}
		c.SetCookie("access_token", newAccess, 900, "/", "", false, true)

		claims, err = utils.ParseToken(newAccess, jwtSecret)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			c.Abort()
			return
		}

		log.Println("Refreshed token user_id: " + claims.UserID)
		c.Set("user_id", claims.UserID)
		c.Next()
	}
}
