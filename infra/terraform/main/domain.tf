# Custom domain on a free managed certificate, in three ordered steps: the
# domain registers on the app, the certificate issues once DNS validates it,
# and an azapi update binds the certificate (SniEnabled). The azurerm domain
# resource can only register the domain with the binding Disabled, and its
# ignore_changes keeps it from undoing the azapi binding. Everything stays
# at count zero while public_hostname is empty.

locals {
  bind_domain = var.public_hostname != "" ? 1 : 0
}

resource "azurerm_container_app_custom_domain" "public" {
  count = local.bind_domain

  name             = var.public_hostname
  container_app_id = azurerm_container_app.app.id

  lifecycle {
    ignore_changes = [certificate_binding_type, container_app_environment_certificate_id]
  }
}

resource "azurerm_container_app_environment_managed_certificate" "public" {
  count = local.bind_domain

  name                         = "${var.prefix}-cert"
  container_app_environment_id = azurerm_container_app_environment.env.id
  subject_name                 = var.public_hostname
  domain_control_validation    = "CNAME"

  depends_on = [azurerm_container_app_custom_domain.public]
}

resource "azapi_update_resource" "domain_binding" {
  count = local.bind_domain

  type        = "Microsoft.App/containerApps@2024-03-01"
  resource_id = azurerm_container_app.app.id

  body = {
    properties = {
      configuration = {
        ingress = {
          customDomains = [
            {
              name          = var.public_hostname
              bindingType   = "SniEnabled"
              certificateId = azurerm_container_app_environment_managed_certificate.public[0].id
            }
          ]
        }
      }
    }
  }

  depends_on = [azurerm_container_app_environment_managed_certificate.public]
}
