package cmd

import (
	"strings"

	internalConfig "github.com/rapor/rapor-be/rapor/config"
	_ "github.com/rapor/rapor-be/rapor/docs"
	"github.com/rapor/rapor-be/framework/common/logger"
	"github.com/rapor/rapor-be/framework/config"
	"github.com/rapor/rapor-be/framework/fiber"
	"github.com/rapor/rapor-be/framework/otel"
	"github.com/rapor/rapor-be/framework/postgres"
	"github.com/rapor/rapor-be/framework/redis"
	"github.com/rapor/rapor-be/libraries/idp"
	"github.com/rapor/rapor-be/libraries/middleware"
	gofiber "github.com/gofiber/fiber/v2"
	"github.com/spf13/cobra"
	filterSwagger "github.com/swaggo/fiber-swagger"
	"go.uber.org/fx"

	// Core User & Auth Modules
	"github.com/rapor/rapor-be/rapor/module/auth"
	"github.com/rapor/rapor-be/rapor/module/roles"
	"github.com/rapor/rapor-be/rapor/module/users"

	// School QR Attendance & Import Modules
	"github.com/rapor/rapor-be/rapor/module/school_attendances"
	"github.com/rapor/rapor-be/rapor/module/school_imports"

	// Penilaian & Monitoring Kepala Sekolah
	"github.com/rapor/rapor-be/rapor/module/grades"
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
		grades.Module,

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
