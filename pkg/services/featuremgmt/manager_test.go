package featuremgmt

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestFeatureManager(t *testing.T) {
	t.Run("check testing stubs", func(t *testing.T) {
		ft := WithManager("a", "b", "c")
		require.True(t, ft.IsEnabledGlobally("a"))
		require.True(t, ft.IsEnabledGlobally("b"))
		require.True(t, ft.IsEnabledGlobally("c"))
		require.False(t, ft.IsEnabledGlobally("d"))

		require.Equal(t, map[string]bool{"a": true, "b": true, "c": true}, ft.GetEnabled(context.Background()))

		// Explicit values
		ft = WithManager("a", true, "b", false)
		require.True(t, ft.IsEnabledGlobally("a"))
		require.False(t, ft.IsEnabledGlobally("b"))
		require.Equal(t, map[string]bool{"a": true}, ft.GetEnabled(context.Background()))
	})

	t.Run("check description and stage configs", func(t *testing.T) {
		ft := FeatureManager{
			flags: map[string]*FeatureFlag{},
		}
		ft.registerFlags(FeatureFlag{
			Name:        "a",
			Description: "first",
		}, FeatureFlag{
			Name:        "a",
			Description: "second",
		}, FeatureFlag{
			Name:  "a",
			Stage: FeatureStagePrivatePreview,
		}, FeatureFlag{
			Name: "a",
		})
		flag := ft.flags["a"]
		require.Equal(t, "second", flag.Description)
		require.Equal(t, FeatureStagePrivatePreview, flag.Stage)
	})

	t.Run("check startup false flags", func(t *testing.T) {
		ft := FeatureManager{
			flags: map[string]*FeatureFlag{},
			startup: map[string]bool{
				"a": true,
				"b": false, // but default true
			},
		}
		ft.registerFlags(FeatureFlag{
			Name: "a",
		}, FeatureFlag{
			Name:       "b",
			Expression: "true",
		}, FeatureFlag{
			Name: "c",
		})
		require.True(t, ft.IsEnabledGlobally("a"))
		require.False(t, ft.IsEnabledGlobally("b"))
		require.False(t, ft.IsEnabledGlobally("c"))
	})

	t.Run("runtime overrides update enabled state", func(t *testing.T) {
		ft := FeatureManager{
			isDevMod: true,
			flags:    map[string]*FeatureFlag{},
			startup:  map[string]bool{},
			warnings: map[string]string{},
		}
		ft.registerFlags(FeatureFlag{
			Name:       "a",
			Expression: "false",
		}, FeatureFlag{
			Name:       "b",
			Expression: "true",
		})

		state, err := ft.SetFeatureToggle("a", true)
		require.NoError(t, err)
		require.True(t, state.Enabled)
		require.Equal(t, "runtime", state.Source)
		require.True(t, ft.IsEnabledGlobally("a"))

		state, err = ft.SetFeatureToggle("b", false)
		require.NoError(t, err)
		require.False(t, state.Enabled)
		require.True(t, state.DefaultEnabled)
		require.Equal(t, "runtime", state.Source)
		require.False(t, ft.IsEnabledGlobally("b"))
		require.Equal(t, map[string]bool{"a": true}, ft.GetEnabled(context.Background()))
	})

	t.Run("runtime overrides reject unknown and read-only flags", func(t *testing.T) {
		ft := FeatureManager{
			isDevMod: false,
			flags:    map[string]*FeatureFlag{},
			startup:  map[string]bool{},
			warnings: map[string]string{},
		}
		ft.registerFlags(FeatureFlag{
			Name:            "dev",
			RequiresDevMode: true,
		})

		_, err := ft.SetFeatureToggle("missing", true)
		require.ErrorIs(t, err, ErrFeatureToggleNotFound)

		state, err := ft.SetFeatureToggle("dev", true)
		require.ErrorIs(t, err, ErrFeatureToggleReadOnly)
		require.False(t, state.Writable)
		require.Equal(t, "requires dev mode", state.Warning)
	})
}
