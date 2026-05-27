import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useContextoAplicacion } from '../context/ContextoAplicacion';
import { servicioConexion } from '../services/conexionServidor';
import { servicioAlmacenamientoLocal } from '../services/almacenamientoLocal';
import { obtenerColorGrupo } from '../utils/validaciones';

const PantallaSeleccionGrupo = ({ navigation }) => {
  const contexto = useContextoAplicacion();
  const { usuario, URL_SERVIDOR, establecerUsuario } = contexto || {};

  if (!contexto || !establecerUsuario) {
    Alert.alert('Error', 'El contexto no está inicializado correctamente. Por favor, vuelve a intentar.');
    navigation.replace('Autenticacion');
    return null;
  }

  const [gruposDisponibles, setGruposDisponibles] = useState([
    { id: 'grupo-a', nombre: 'Grupo A', miembros: 0 },
    { id: 'grupo-b', nombre: 'Grupo B', miembros: 0 },
    { id: 'grupo-c', nombre: 'Grupo C', miembros: 0 },
    { id: 'grupo-d', nombre: 'Grupo D', miembros: 0 }
  ]);
  const [cargando, setCargando] = useState(false);
  const [actualizandoMiembros, setActualizandoMiembros] = useState(false);
  const [grupoUniendo, setGrupoUniendo] = useState(null);
  const gruposRef = useRef(gruposDisponibles);

  useEffect(() => {
    gruposRef.current = gruposDisponibles;
  }, [gruposDisponibles]);

  useEffect(() => {
    servicioConexion.establecerURL(URL_SERVIDOR);
  }, [URL_SERVIDOR]);

  const actualizarMiembrosGrupos = useCallback(async () => {
    setActualizandoMiembros(true);
    try {
      const gruposActualizados = await Promise.all(
        gruposRef.current.map(async (grupo) => {
          try {
            const miembros = await servicioConexion.obtenerMiembrosGrupo(grupo.id);
            return { ...grupo, miembros: miembros.length };
          } catch (error) {
            return { ...grupo, miembros: 0 };
          }
        })
      );
      setGruposDisponibles(gruposActualizados);
    } catch (error) {
      // No mostrar el error al usuario
    } finally {
      setActualizandoMiembros(false);
    }
  }, []);

  // Actualizar miembros cada 20 segundos
  useEffect(() => {
    actualizarMiembrosGrupos();
    const intervalo = setInterval(actualizarMiembrosGrupos, 20000);
    return () => clearInterval(intervalo);
  }, [actualizarMiembrosGrupos]);

  // Manejar unión a un grupo
  const manejarUnirGrupo = async (grupo) => {
    setGrupoUniendo(grupo.id);
    setCargando(true);

    try {
      // Crear sesión en el backend
      const respuestaSesion = await servicioConexion.crearSesion(
        usuario,
        grupo.id
      );

      // Guardar datos localmente
      await servicioAlmacenamientoLocal.guardarUsuario({
        nombre: usuario,
        idSesion: respuestaSesion.session_id,
        idGrupo: grupo.id,
        nombreGrupo: grupo.nombre,
      });

      await servicioAlmacenamientoLocal.guardarSesion(respuestaSesion);

      // Establecer usuario en el contexto
      establecerUsuario({
        nombre: usuario,
        idSesion: respuestaSesion.session_id,
        idGrupo: grupo.id,
        nombreGrupo: grupo.nombre,
      });

      // Navegar a la pantalla principal
      navigation.replace('Hub');
    } catch (error) {
      if (error.message.includes('ya existe') || error.message.includes('duplicado') || error.message.includes('en uso')) {
        Alert.alert('Error', 'Este nombre ya está en uso en este grupo. Por favor, elige otro nombre.');
      } else if (error.message.includes('Servicio no disponible')) {
        Alert.alert('Error', 'El servidor no está disponible. Intenta nuevamente más tarde.');
      } else {
        Alert.alert('Error', 'Error al conectar. Por favor, verifica tu conexión e intenta nuevamente.');
      }
    } finally {
      setCargando(false);
      setGrupoUniendo(null);
    }
  };

  // Renderizar tarjeta de grupo
  const renderizarTarjetaGrupo = (grupo) => {
    const colorGrupo = obtenerColorGrupo(grupo.id);
    const estaUniendo = grupoUniendo === grupo.id;

    return (
      <View key={grupo.id} style={[estilos.tarjetaGrupo, { borderTopColor: colorGrupo }]}>
        <View style={estilos.encabezadoTarjeta}>
          <View style={estilos.contenedorNombre}>
            <View style={[estilos.indicadorColor, { backgroundColor: colorGrupo }]} />
            <Text style={estilos.nombreGrupo}>{grupo.nombre}</Text>
          </View>
          <View style={estilos.contenedorMiembros}>
            <Ionicons name="people-outline" size={20} color="#8E8E93" />
            <Text style={estilos.textoMiembros}>
              {grupo.miembros} estudiante{grupo.miembros !== 1 ? 's' : ''}
            </Text>
            {actualizandoMiembros && <ActivityIndicator size="small" color="#8E8E93" style={estilos.indicadorCarga} />}
          </View>
        </View>

        <TouchableOpacity
          style={[estilos.botonUnir, { backgroundColor: colorGrupo }]}
          onPress={() => manejarUnirGrupo(grupo)}
          disabled={estaUniendo || cargando}
        >
          {estaUniendo ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={estilos.textoBotonUnir}>Unirse al grupo</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={estilos.contenedorSeguro}>
      <View style={estilos.contenedor}>
        {/* Encabezado */}
        <View style={estilos.encabezado}>
          <TouchableOpacity
            style={estilos.botonAtras}
            onPress={() => navigation.replace('Autenticacion')}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <View style={estilos.contenedorTitulo}>
            <Text style={estilos.titulo}>Selecciona un Grupo</Text>
            <Text style={estilos.subtitulo}>Hola, {usuario}</Text>
          </View>
        </View>

        {/* Lista de grupos */}
        <ScrollView
          style={estilos.contenido}
          contentContainerStyle={estilos.contenidoScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={estilos.contenedorTarjetas}>
            {gruposDisponibles.map(renderizarTarjetaGrupo)}
          </View>
        </ScrollView>
      </View>
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
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  botonAtras: {
    padding: 8,
    marginRight: 12,
  },
  contenedorTitulo: {
    flex: 1,
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  subtitulo: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  contenido: {
    flex: 1,
  },
  contenidoScroll: {
    padding: 16,
  },
  contenedorTarjetas: {
    gap: 16,
  },
  tarjetaGrupo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderTopWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  encabezadoTarjeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  contenedorNombre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  indicadorColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  nombreGrupo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  contenedorMiembros: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  textoMiembros: {
    fontSize: 14,
    color: '#8E8E93',
  },
  indicadorCarga: {
    marginLeft: 4,
  },
  botonUnir: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  textoBotonUnir: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PantallaSeleccionGrupo;
