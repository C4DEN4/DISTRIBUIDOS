import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useContextoAplicacion } from '../context/ContextoAplicacion';
import { servicioConexion } from '../services/conexionServidor';
import { servicioAlmacenamientoLocal } from '../services/almacenamientoLocal';
import { obtenerColorGrupo } from '../utils/validaciones';

const PantallaAutenticacion = ({ navigation }) => {
  const { establecerUsuario, URL_SERVIDOR } = useContextoAplicacion();

  const [nombre, setNombre] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Establecer URL del servidor
  useEffect(() => {
    servicioConexion.establecerURL(URL_SERVIDOR);
  }, [URL_SERVIDOR]);

  // Validar formulario
  const formularioValido = () => {
    return nombre.trim().length > 0;
  };

  // Manejar ingreso al sistema
  const manejarIngreso = async () => {
    // Validar formulario
    if (!formularioValido()) {
      setError('Por favor, ingresa tu nombre');
      return;
    }

    setError('');
    setCargando(true);

    try {
      // Guardar datos localmente
      await servicioAlmacenamientoLocal.guardarUsuario({
        nombre: nombre.trim(),
        idSesion: null,
        idGrupo: null,
        nombreGrupo: null,
      });

      // Establecer usuario en el contexto
      establecerUsuario({
        nombre: nombre.trim(),
        idSesion: null,
        idGrupo: null,
        nombreGrupo: null,
      });

      // Navegar a la pantalla de selección de grupos
      navigation.replace('SeleccionGrupo');
    } catch (error) {
      setError('Error al guardar datos. Por favor, intenta nuevamente.');
    } finally {
      setCargando(false);
    }
  };


  return (
    <SafeAreaView style={estilos.contenedorSeguro}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={estilos.contenedor}
      >
        <ScrollView contentContainerStyle={estilos.contenidoScroll}>
          <View style={estilos.contenedorPrincipal}>
            {/* Título */}
            <View style={estilos.contenedorTitulo}>
              <Text style={estilos.titulo}>Classroom Hub</Text>
              <Text style={estilos.subtitulo}>Sistema Distribuido de Aula</Text>
            </View>

            {/* Formulario */}
            <View style={estilos.contenedorFormulario}>
              {/* Campo de nombre */}
              <View style={estilos.contenedorCampo}>
                <Text style={estilos.etiqueta}>Tu nombre:</Text>
                <TextInput
                  style={[
                    estilos.campoTexto,
                    error && error.includes('nombre') && estilos.campoError
                  ]}
                  placeholder="Ingresa tu nombre"
                  value={nombre}
                  onChangeText={(texto) => {
                    setNombre(texto);
                    setError('');
                  }}
                  maxLength={30}
                  autoCapitalize="words"
                  autoComplete="name"
                />
                <Text style={estilos.contadorCaracteres}>
                  {nombre.length}/30 caracteres
                </Text>
              </View>


              {/* Mensaje de error */}
              {error ? (
                <View style={estilos.contenedorError}>
                  <Text style={estilos.textoError}>{error}</Text>
                </View>
              ) : null}

              {/* Botón de ingreso */}
              <TouchableOpacity
                style={[
                  estilos.botonIngreso,
                  !formularioValido() && estilos.botonDeshabilitado,
                  cargando && estilos.botonCargando,
                ]}
                onPress={manejarIngreso}
                disabled={!formularioValido() || cargando}
              >
                {cargando ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={estilos.textoBotonIngreso}>
                    {formularioValido() ? 'Ingresar' : 'Completa los campos'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Información adicional */}
              <View style={estilos.contenedorInfo}>
                <Text style={estilos.textoInfo}>
                  Asegurate de tener conexion a internet para ingresar.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  contenedorSeguro: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  contenedor: {
    flex: 1,
  },
  contenidoScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  contenedorPrincipal: {
    flex: 1,
    justifyContent: 'center',
  },
  contenedorTitulo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  titulo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 16,
    color: '#8E8E93',
  },
  contenedorFormulario: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contenedorCampo: {
    marginBottom: 20,
  },
  etiqueta: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  campoTexto: {
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F2F2F7',
  },
  campoError: {
    borderColor: '#FF3B30',
  },
  contadorCaracteres: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'right',
  },
  contenedorError: {
    backgroundColor: '#FF3B30' + '10',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  textoError: {
    color: '#FF3B30',
    fontSize: 14,
  },
  botonIngreso: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  botonDeshabilitado: {
    backgroundColor: '#C7C7CC',
  },
  botonCargando: {
    opacity: 0.7,
  },
  textoBotonIngreso: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  contenedorInfo: {
    alignItems: 'center',
  },
  textoInfo: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});

export default PantallaAutenticacion;
