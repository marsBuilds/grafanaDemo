package ualert

import "github.com/grafana/grafana/pkg/services/sqlstore/migrator"

// AddAlertRuleChangeMessageColumn adds a column for the latest user-provided change
// description on the alert_rule row (version history still stores per-version messages).
func AddAlertRuleChangeMessageColumn(mg *migrator.Migrator) {
	mg.AddMigration("add change_message column to alert_rule table", migrator.NewAddColumnMigration(migrator.Table{Name: "alert_rule"}, &migrator.Column{
		Name:     "change_message",
		Type:     migrator.DB_Text,
		Nullable: true,
	}))
}
