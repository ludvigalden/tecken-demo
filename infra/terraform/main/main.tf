data "azurerm_resource_group" "app" {
  name = "${var.prefix}-rg"
}

locals {
  # Registry names are global and alphanumeric.
  registry_name = "${replace(var.prefix, "-", "")}acr"
}

# Private image registry. The container app pulls with its managed identity,
# and no registry password exists anywhere.
resource "azurerm_container_registry" "acr" {
  name                = local.registry_name
  resource_group_name = data.azurerm_resource_group.app.name
  location            = data.azurerm_resource_group.app.location
  sku                 = "Basic"
  admin_enabled       = false
}

resource "azurerm_user_assigned_identity" "app" {
  name                = "${var.prefix}-app-id"
  resource_group_name = data.azurerm_resource_group.app.name
  location            = data.azurerm_resource_group.app.location
}

resource "azurerm_role_assignment" "app_acr_pull" {
  scope                = azurerm_container_registry.acr.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

resource "azurerm_container_app_environment" "env" {
  name                = "${var.prefix}-env"
  resource_group_name = data.azurerm_resource_group.app.name
  location            = data.azurerm_resource_group.app.location

  # The service provisions this profile by default; declaring it keeps the
  # second plan free of drift.
  workload_profile {
    name                  = "Consumption"
    workload_profile_type = "Consumption"
  }
}

# One Node process serves the app, the media and the API. Consumption plan,
# scaled to zero when idle: the first request after a pause waits for a
# container start.
resource "azurerm_container_app" "app" {
  name                         = "${var.prefix}-app"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = data.azurerm_resource_group.app.name
  revision_mode                = "Single"
  workload_profile_name        = "Consumption"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app.id]
  }

  registry {
    server   = azurerm_container_registry.acr.login_server
    identity = azurerm_user_assigned_identity.app.id
  }

  template {
    min_replicas = 0
    max_replicas = 1

    container {
      name   = "tecken"
      image  = var.image
      cpu    = 0.25
      memory = "0.5Gi"

      readiness_probe {
        transport               = "HTTP"
        port                    = 8080
        path                    = "/v1/health"
        initial_delay           = 1
        interval_seconds        = 5
        failure_count_threshold = 3
      }
    }
  }

  ingress {
    target_port                = 8080
    external_enabled           = true
    transport                  = "auto"
    allow_insecure_connections = false

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  lifecycle {
    # Deployments replace the image; Terraform owns the shape around it.
    ignore_changes = [template[0].container[0].image]
  }

  depends_on = [azurerm_role_assignment.app_acr_pull]
}
