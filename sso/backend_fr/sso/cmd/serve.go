package cmd

import (
	"strings"

	internalConfig "github.com/sso/sso-be/sso/config"
	_ "github.com/sso/sso-be/sso/docs"
	"github.com/sso/sso-be/framework/common/logger"
	"github.com/sso/sso-be/framework/config"
	"github.com/sso/sso-be/framework/fiber"
	"github.com/sso/sso-be/framework/otel"
	"github.com/sso/sso-be/framework/postgres"
	"github.com/sso/sso-be/framework/redis"
	"github.com/sso/sso-be/libraries/idp"
	"github.com/sso/sso-be/libraries/middleware"
	gofiber "github.com/gofiber/fiber/v2"
	"github.com/spf13/cobra"
	filterSwagger "github.com/swaggo/fiber-swagger"
	"go.uber.org/fx"

	// Core User & Auth Modules
	"github.com/sso/sso-be/sso/module/auth"
	"github.com/sso/sso-be/sso/module/roles"
	"github.com/sso/sso-be/sso/module/users"

	// School QR Attendance & Import Modules
	"github.com/sso/sso-be/sso/module/school_attendances"
	"github.com/sso/sso-be/sso/module/school_imports"
	"github.com/sso/sso-be/sso/module/school_people"
)

// @title           School QR Barcode Attendance API
// @version         1.0
// @description     API Documentation for School QR Barcode Attendance System (1 Admin, 20 Guru, Siswa)
// @termsOfService  http://swagger.io/terms/

// @contact.name    School Attendance Support
// @contact.email   support@sekolah.sch.id

// @license.name    Apache 2.0
// @license.url     http://www.apache.org/licenses/LICENSE-2.0.html

// @host            localhost:8080
// @BasePath        /
// @schemes         http
// @securityDefinitions.apikey ApiKeyAuth
// @in header
// @name Authorization
var serve = &cobra.Command{
	Use:   "serve",
	Short: "Start the application server",
	RunE:  serveE,
}

func serveE(cmd *cobra.Command, args []string) error {
	fx.New(
		// infrastructure
		logger.Module,
		config.Module,
		fiber.Module,
		otel.Module,
		postgres.Module,
		redis.Module,

		// supply config source & resolvers
		fx.Supply(
			fx.Annotated{
				Group: "config_options",
				Target: config.WithSources(
					config.FileSource("config/config.json"),
					config.EnvSource("APP_", func(key string) (string, bool) {
						return strings.ToLower(key), true
					}),
				),
			},
			fx.Annotated{
				Group: "config_options",
				Target: config.WithResolvers(
					config.FileResolver(),
					config.Base64Resolver(),
				),
			},
		),

		// configurations
		fx.Provide(
			config.ProvideConfig[internalConfig.ApplicationConfig](),
			internalConfig.Postgres,
			internalConfig.Redis,
			internalConfig.Fiber,
			internalConfig.Otel,
			internalConfig.Logger,
			internalConfig.InternalApp,
			middleware.NewAuthorizationMiddleware,
		),

		middleware.HealthModule,

		// Core User & Auth Modules
		roles.Module,
		users.Module,
		auth.Module,

		// School QR Attendance & Bulk Import Modules
		school_attendances.Module,
		school_imports.Module,
		school_people.Module,

		fx.Provide(
			fx.Annotate(
				idp.NewIDP,
				fx.As(new(idp.IDPProvider)),
			),
		),
		fx.Invoke(func(app *gofiber.App) {
			app.Use(middleware.CSRFOriginValidator())
			app.Get("/swagger/*", filterSwagger.WrapHandler)
		}),
	).Run()

	return nil
}
